from typing import Any
from dataclasses import fields
from caseconverter import snakecase


def convert_json_to[T](data_class: type[T], json: dict[str, Any]) -> T:
    allowed_fields = {field.name for field in fields(data_class)}

    filtered_data = {}

    for key, value in json.items():
        snake_key = snakecase(key)

        if snake_key in allowed_fields:
            filtered_data[snake_key] = value

    return data_class(**filtered_data)
