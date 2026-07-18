import { Link } from 'react-router-dom'
import { categories, Category } from '../data/categories'

export default function CategoryGrid() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {categories.map((cat: Category) => (
        <Link
          key={cat.id}
          to={`/category/${cat.id}`}
          className="card-hover bg-surface border border-primary/20 rounded-xl p-6 hover:border-accent transition group relative"
        >
          <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">
            {cat.icon}
          </div>
          <h3 className="text-xl font-bold text-primary mb-2 group-hover:text-accent transition">
            {cat.name}
          </h3>
          <p className="text-sm text-text2">{cat.tools.length} tools</p>
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition">
            <div className="h-full w-full rounded-xl" style={{ background: 'var(--gradient-card)' }} />
          </div>
        </Link>
      ))}
    </div>
  )
}