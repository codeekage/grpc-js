export interface RequestFilter {
  from?: Date
  to?: Date
  limit?: number
  page?: number
}

export function queryFilter<T>(filter: RequestFilter, args: Record<string, any> = {}) {
  const { from, to } = filter
  const query: any = {}

  for (const key in args) {
    if (args[key]) query[key] = args[key]

    if (args[key] && args[key].hasOwnProperty('$in') && typeof args[key].$in === 'undefined')
      delete query[key]
  }

  if (from || to) {
    query.createdAt = {}
    if (from) query.createdAt.$gte = new Date(from)
    if (to) query.createdAt.$lt = new Date(to) // Todo: handle date
  }

  return query as T
}
