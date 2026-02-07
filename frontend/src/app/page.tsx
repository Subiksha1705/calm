import { redirect } from 'next/navigation';


/**
 * Home Page
 * 
 * Redirects to the chat area. This page serves as an entry point.
 * When parallel routes are active, this is not typically shown.
 */
export default function HomePage() {
  redirect('/chat');
}
