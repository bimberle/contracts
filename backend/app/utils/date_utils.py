from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta

def add_months(date: datetime, months: int) -> datetime:
    """Fügt Monate zu einem Datum hinzu"""
    return date + relativedelta(months=months)

def months_between(start_date: datetime, end_date: datetime) -> int:
    """Berechnet die Anzahl der Monate zwischen zwei Daten"""
    if start_date > end_date:
        return 0
    return (end_date.year - start_date.year) * 12 + end_date.month - start_date.month

def start_of_month(date: datetime) -> datetime:
    """Gibt den ersten Tag des Monats zurück"""
    return date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

def end_of_month(date: datetime) -> datetime:
    """Gibt den letzten Tag des Monats zurück"""
    next_month = add_months(start_of_month(date), 1)
    return next_month - timedelta(seconds=1)

def is_before(date1: datetime, date2: datetime) -> bool:
    """Prüft ob date1 vor date2 liegt"""
    return date1 < date2

def is_after(date1: datetime, date2: datetime) -> bool:
    """Prüft ob date1 nach date2 liegt"""
    return date1 > date2
