import tuitionApp from '../../../src/tuition-routes'

export const onRequest: PagesFunction = async (context) => {
  // Log the URL for debugging
  console.log('Tuition route called with URL:', context.request.url)
  console.log('Path:', new URL(context.request.url).pathname)
  
  return tuitionApp.fetch(context.request, context.env, context)
}
