import Link from 'next/link'
import { BookOpen, Search, TrendingUp, User } from 'lucide-react'

export function Navigation() {
  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/" className="flex items-center">
              <BookOpen className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">
                Jnana
              </span>
            </Link>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
              <Link
                href="/articles"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                <Search className="h-4 w-4 mr-1" />
                Articles
              </Link>
              <Link
                href="/graph"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                Graph
              </Link>
              <Link
                href="/trends"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                <TrendingUp className="h-4 w-4 mr-1" />
                Trends
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            <Link
              href="/profile"
              className="p-2 rounded-full text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <User className="h-6 w-6" />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
