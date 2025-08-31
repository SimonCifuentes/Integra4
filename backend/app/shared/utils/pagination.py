def paginate(queryset, page: int, limit: int):
    offset = (page - 1) * limit
    return queryset.limit(limit).offset(offset)
