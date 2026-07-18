/**
 * FILE: src/lib/orchestrator.ts
 *
 * Multi-tool workflow orchestrator for Toolkit.
 *
 * Responsibilities:
 *   - Builds an ordered OrchestrationPlan from a RouterResult (Phase 3)
 *   - Executes steps sequentially (respecting dependsOnStep) or in parallel
 *   - Maps output keys from one step to input keys of the next
 *   - Stores completed interaction to ragEngine memory after each step
 *   - Surfaces per-step loading / success / error states to the UI
 *
 * All types are fully strict — no `any`, no `unknown` without guards.
 */

import { type RouterResult, type ToolMatch } from "./aiRouter";
import { storeInteraction } from "./ragEngine";

// ── Types ─────────────────────────────────────────────────────────────────────

export type StepPrefill = Record<string, string | number | boolean | null>;
export type StepOutput  = Record<string, string | number | boolean | null>;

export type OrchestrationStep = {
  stepNumber: number;
  toolId: string;
  toolName: string;
  prefillData: StepPrefill;
  dependsOnStep: number | null;
  /** Maps output-key of the *dependency step* → input-key of this step. */
  outputMapping: Record<string, string>;
};

export type OrchestrationPlan = {
  id: string;
  userQuery: string;
  steps: OrchestrationStep[];
  estimatedDurationMs: number;
  canRunInParallel: boolean;
};

export type StepStatus = "pending" | "running" | "success" | "error" | "skipped";

export type StepResult = {
  stepNumber: number;
  toolId: string;
  toolName: string;
  status: StepStatus;
  output: StepOutput;
  error: string | null;
  durationMs: number;
};

export type OrchestrationResult = {
  planId: string;
  userQuery: string;
  success: boolean;
  stepResults: StepResult[];
  totalDurationMs: number;
};

// ── Callback type for step executors ─────────────────────────────────────────

/**
 * The caller supplies this function. It receives a fully-resolved step
 * (with dependency outputs already merged into prefillData) and returns
 * the tool's output. Typically triggers navigation and awaits user action,
 * or in a headless context executes the tool directly.
 */
export type StepExecutor = (step: OrchestrationStep) => Promise<StepOutput>;

// ── Plan builder ─────────────────────────────────────────────────────────────

/**
 * Converts a RouterResult from the AI router into an OrchestrationPlan.
 * Handles both single-tool and multi-tool cases.
 */
export function buildPlanFromRouterResult(
  routerResult: RouterResult,
  userQuery: string
): OrchestrationPlan {
  const allMatches: ToolMatch[] = [
    ...(routerResult.primaryTool ? [routerResult.primaryTool] : []),
    ...routerResult.additionalTools
  ].sort((a, b) => a.executionOrder - b.executionOrder);

  const steps: OrchestrationStep[] = allMatches.map(match => ({
    stepNumber: match.executionOrder,
    toolId: match.toolId,
    toolName: match.tool.name,
    prefillData: match.prefillData,
    dependsOnStep: match.dependsOnToolId
      ? (allMatches.find(m => m.toolId === match.dependsOnToolId)?.executionOrder ?? null)
      : null,
    outputMapping: {}
  }));

  // Detect parallel steps: steps sharing the same executionOrder run in parallel
  const orderCounts = new Map<number, number>();
  for (const s of steps) {
    orderCounts.set(s.stepNumber, (orderCounts.get(s.stepNumber) ?? 0) + 1);
  }
  const canRunInParallel = [...orderCounts.values()].some(c => c > 1);

  // Rough time estimate: 2s per step, 500ms saved per parallel group
  const uniqueOrders = orderCounts.size;
  const estimatedDurationMs = uniqueOrders * 2000 - (canRunInParallel ? 500 : 0);

  return {
    id: crypto.randomUUID(),
    userQuery,
    steps,
    estimatedDurationMs,
    canRunInParallel
  };
}

// ── Step data resolver ────────────────────────────────────────────────────────

function mergeStepData(
  step: OrchestrationStep,
  completedResults: Map<number, StepResult>
): StepPrefill {
  if (step.dependsOnStep === null) return step.prefillData;

  const dep = completedResults.get(step.dependsOnStep);
  if (!dep || dep.status !== "success") return step.prefillData;

  const mappedInputs: StepPrefill = {};
  for (const [outputKey, inputKey] of Object.entries(step.outputMapping)) {
    const val = dep.output[outputKey];
    if (val !== undefined) mappedInputs[inputKey] = val;
  }

  return { ...step.prefillData, ...mappedInputs };
}

// ── Core orchestrator class ───────────────────────────────────────────────────

export class MultiToolOrchestrator {
  private completedResults = new Map<number, StepResult>();
  private readonly plan: OrchestrationPlan;

  constructor(plan: OrchestrationPlan) {
    this.plan = plan;
  }

  /**
   * Executes the orchestration plan step-by-step.
   *
   * Parallel steps (same executionOrder) are awaited with Promise.allSettled.
   * Sequential steps are awaited one at a time. A failed step that other steps
   * depend on causes dependents to be marked "skipped".
   *
   * @param executor  Caller-supplied step runner.
   * @param onStepChange  Optional callback fired after each step completes.
   */
  async run(
    executor: StepExecutor,
    onStepChange?: (stepResult: StepResult) => void
  ): Promise<OrchestrationResult> {
    const startTime = Date.now();

    // Group steps by executionOrder for parallel batches
    const groups = this.groupByOrder(this.plan.steps);
    const failedStepNumbers = new Set<number>();

    for (const [, batch] of groups) {
      const batchResults = await Promise.allSettled(
        batch.map(step => this.executeStep(step, executor, failedStepNumbers))
      );

      for (const settled of batchResults) {
        const result = settled.status === "fulfilled"
          ? settled.value
          : this.makeErrorResult(
              // find the step that failed (Promise.allSettled order matches batch order)
              batch[batchResults.indexOf(settled)],
              settled.reason instanceof Error
                ? settled.reason.message
                : String(settled.reason)
            );

        this.completedResults.set(result.stepNumber, result);
        if (result.status === "error" || result.status === "skipped") {
          failedStepNumbers.add(result.stepNumber);
        }
        onStepChange?.(result);
      }
    }

    const stepResults = [...this.completedResults.values()].sort(
      (a, b) => a.stepNumber - b.stepNumber
    );
    const success = stepResults.every(r => r.status === "success");

    return {
      planId: this.plan.id,
      userQuery: this.plan.userQuery,
      success,
      stepResults,
      totalDurationMs: Date.now() - startTime
    };
  }

  private async executeStep(
    step: OrchestrationStep,
    executor: StepExecutor,
    failedSteps: Set<number>
  ): Promise<StepResult> {
    // Skip if a dependency failed
    if (step.dependsOnStep !== null && failedSteps.has(step.dependsOnStep)) {
      return {
        stepNumber: step.stepNumber,
        toolId: step.toolId,
        toolName: step.toolName,
        status: "skipped",
        output: {},
        error: `Skipped — dependency step ${step.dependsOnStep} failed.`,
        durationMs: 0
      };
    }

    const stepStart = Date.now();
    const mergedStep: OrchestrationStep = {
      ...step,
      prefillData: mergeStepData(step, this.completedResults)
    };

    try {
      const output = await executor(mergedStep);
      const result: StepResult = {
        stepNumber: step.stepNumber,
        toolId: step.toolId,
        toolName: step.toolName,
        status: "success",
        output,
        error: null,
        durationMs: Date.now() - stepStart
      };

      // Non-blocking: persist interaction to RAG memory
      storeInteraction(
        step.toolId,
        this.plan.userQuery,
        mergedStep.prefillData as Record<string, string | number | boolean | null>,
        output
      ).catch(() => undefined);

      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return this.makeErrorResult(step, message, Date.now() - stepStart);
    }
  }

  private makeErrorResult(
    step: OrchestrationStep,
    message: string,
    durationMs = 0
  ): StepResult {
    return {
      stepNumber: step.stepNumber,
      toolId: step.toolId,
      toolName: step.toolName,
      status: "error",
      output: {},
      error: message,
      durationMs
    };
  }

  private groupByOrder(steps: OrchestrationStep[]): Map<number, OrchestrationStep[]> {
    const map = new Map<number, OrchestrationStep[]>();
    for (const step of steps) {
      const group = map.get(step.stepNumber) ?? [];
      group.push(step);
      map.set(step.stepNumber, group);
    }
    // Return sorted by order
    return new Map([...map.entries()].sort(([a], [b]) => a - b));
  }

  /** Resets state for re-running the same plan (e.g. retry). */
  reset(): void {
    this.completedResults.clear();
  }

  getCompletedResults(): StepResult[] {
    return [...this.completedResults.values()].sort(
      (a, b) => a.stepNumber - b.stepNumber
    );
  }
}

// ── Standalone utilities ──────────────────────────────────────────────────────

/**
 * Maps output fields from one step's result to the prefillData of the next.
 * Useful outside the orchestrator for manual wiring.
 */
export function passOutputToNextStep(
  stepOutput: StepOutput,
  outputMapping: Record<string, string>
): StepPrefill {
  const mapped: StepPrefill = {};
  for (const [sourceKey, targetKey] of Object.entries(outputMapping)) {
    const val = stepOutput[sourceKey];
    if (val !== undefined) mapped[targetKey] = val;
  }
  return mapped;
}

/**
 * Summarises an OrchestrationResult for display in the UI or reasoning trace.
 */
export function summariseOrchestration(result: OrchestrationResult): string {
  const counts = { success: 0, error: 0, skipped: 0 };
  for (const r of result.stepResults) {
    if (r.status === "success") counts.success++;
    else if (r.status === "error") counts.error++;
    else if (r.status === "skipped") counts.skipped++;
  }
  const total = result.stepResults.length;
  return (
    `Workflow "${result.userQuery}" — ` +
    `${counts.success}/${total} steps succeeded` +
    (counts.error   > 0 ? `, ${counts.error} failed`   : "") +
    (counts.skipped > 0 ? `, ${counts.skipped} skipped` : "") +
    ` (${result.totalDurationMs}ms total)`
  );
}
