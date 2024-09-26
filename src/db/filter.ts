export interface RequestFilter {
  from?: Date
  to?: Date
  limit?: number
  page?: number
  skip?: number
}

type PaginationResponse<T> = {
  page: number
  limit: number
  skip: number
  query: T
}

function getPagination<T extends RequestFilter>(page: number, limit: number, query: T): PaginationResponse<T> {
  const skip = (page - 1) * limit
  return { page, limit, skip, query }
}

export function queryFilter<T extends RequestFilter>(filter: RequestFilter, args: Record<string, any> = {}) {
  const { from, to, page = 1, limit = 10 } = filter
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

  return getPagination<T>(page, limit, query)
}
