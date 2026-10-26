import { createBrowserRouter } from 'react-router'
import RootLayout from './routes/RootLayout'
import CrashScreen from './routes/CrashScreen'
import HomePage from './routes/HomePage'
import SearchPage from './routes/SearchPage'
import GenrePage from './routes/GenrePage'
import FeaturedPage from './routes/FeaturedPage'
import BookDetailsPage from './routes/BookDetailsPage'
import LibraryPage from './routes/LibraryPage'
import LoginPage from './routes/LoginPage'
import SignupPage from './routes/SignupPage'
import NotFoundPage from './routes/NotFoundPage'
import CrashTestPage from './routes/CrashTestPage'
import { GuestOnly, RequireAuth } from './components/RouteGuards'

const devRoutes = import.meta.env.DEV ? [{ path: 'dev/crash', Component: CrashTestPage }] : []

export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    // Fallback if the layout itself fails
    ErrorBoundary: CrashScreen,
    children: [
      {
        // Pathless layout route: page errors render here, so the nav stays usable
        ErrorBoundary: CrashScreen,
        children: [
          { index: true, Component: HomePage },
          { path: 'search', Component: SearchPage },
          { path: 'genre/:genre', Component: GenrePage },
          { path: 'featured', Component: FeaturedPage },
          { path: 'books/:id', Component: BookDetailsPage },
          { Component: RequireAuth, children: [{ path: 'library', Component: LibraryPage }] },
          {
            Component: GuestOnly,
            children: [
              { path: 'login', Component: LoginPage },
              { path: 'signup', Component: SignupPage },
            ],
          },
          ...devRoutes,
          { path: '*', Component: NotFoundPage },
        ],
      },
    ],
  },
])
