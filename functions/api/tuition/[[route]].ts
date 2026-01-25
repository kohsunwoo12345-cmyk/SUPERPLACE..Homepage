import tuitionApp from '../../../src/tuition-routes'

export const onRequest: PagesFunction = async (context) => {
  // Updated: 2026-01-25 - Fixed class_name column references
  console.log('Tuition route called with URL:', context.request.url)
  console.log('Path:', new URL(context.request.url).pathname)
  
  return tuitionApp.fetch(context.request, context.env, context)
}
