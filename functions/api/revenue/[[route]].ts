import revenueApp from '../../../src/revenue-routes'

export const onRequest: PagesFunction = async (context) => {
  return revenueApp.fetch(context.request, context.env, context)
}
