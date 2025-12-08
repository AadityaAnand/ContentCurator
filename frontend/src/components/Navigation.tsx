import Link from 'next/link'
import { BookOpen, Search, TrendingUp, User, LogOut } from 'lucide-react'
import { useAuth } from '@/lib/useAuth'

export function Navigation() {
  const { user, isAuthenticated, logout } = useAuth()

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
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link
                  href="/profile"
                  className="inline-flex items-center px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  <User className="h-4 w-4 mr-1" />
                  {user?.username}
                </Link>
                <button
                  onClick={logout}
                  className="inline-flex items-center px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex items-center px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
