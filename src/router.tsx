import { lazy } from 'react'
import { RouteObject } from 'react-router-dom'

const Home = lazy(() => import('./pages/Home'))
const CategoryPage = lazy(() => import('./pages/CategoryPage'))
const ToolPage = lazy(() => import('./pages/ToolPage'))

export const routes: RouteObject[] = [
  { path: '/', element: <Home /> },
  { path: '/category/:categoryId', element: <CategoryPage /> },
  { path: '/tools/:slug', element: <ToolPage /> }
]