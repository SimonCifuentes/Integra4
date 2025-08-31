def project_dict(data: dict, fields: list[str] | None):
    if not fields:
        return data
    return {k: v for k, v in data.items() if k in fields}
