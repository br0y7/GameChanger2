from dataclasses import dataclass


@dataclass
class Team:
    # id: str #TODO: consider this when loading from csv
    name: str
    # league: League  #TODO: Consider a League dataclass
