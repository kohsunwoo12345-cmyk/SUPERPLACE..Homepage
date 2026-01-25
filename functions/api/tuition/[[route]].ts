import tuitionApp from '../../../src/tuition-routes'

export const onRequest: PagesFunction = async (context) => {
  return tuitionApp.fetch(context.request, context.env, context)
}
