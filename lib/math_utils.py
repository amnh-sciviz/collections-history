import math

def ceilInt(value):
    return int(math.ceil(value))

def ease(n, easingFunction="sin", exp=6, invert=False):

    if easingFunction.endswith("Invert"):
        easingFunction = easingFunction[:-6]
        invert = True

    if "^" in easingFunction:
        easingFunction, exp = easingFunction.split("^")
        exp = int(exp)

    if easingFunction == "sin":
        n = easeSinInOut(n)
    elif easingFunction == "quadIn":
        n = n ** 2
    elif easingFunction == "quadOut":
        n = n * (2.0 - n)
    elif easingFunction == "quadInOut":
        n = 2.0 * n * n if n < 0.5 else -1.0 + (4 - 2.0*n)*n
    elif easingFunction == "cubicIn":
        n = n ** 3
    elif easingFunction == "cubicOut":
        n = (n - 1.0)**3 + 1.0
    elif easingFunction == "cubicInOut":
        n = 4.0 * (n ** 3) if n < 0.5 else (n-1.0)*(2*n-2)*(2*n-2)+1
    elif easingFunction == "quartIn":
        n = n ** 4
    elif easingFunction == "quartOut":
        n = 1.0 - (n-1.0)**4
    elif easingFunction == "quartInOut":
        n = 8.0 * n**4 if n < 0.5 else 1.0 - 8.0 * (n-1.0)**4
    elif easingFunction == "quintIn":
        n = n ** 5
    elif easingFunction == "quintOut":
        n = 1.0 + (n - 1.0) ** 5
    elif easingFunction == "quintInOut":
        n = 16.0 * n**5 if n < 0.5 else 1.0 + 16.0 * (n-1.0)**5
    elif easingFunction == "expIn":
        n = n ** exp
    elif easingFunction == "expOut":
        n = 1.0 - (n-1.0)**exp if exp % 2 <= 0 else 1.0 + (n-1.0)**exp
    elif easingFunction == "expInOut":
        if exp % 2 <= 0:
            n = 2**(exp-1) * n**exp if n < 0.5 else 1.0 - 2**(exp-1) * (n-1.0)**exp
        else:
            n = 2**(exp-1) * n**exp if n < 0.5 else 1.0 + 2**(exp-1) * (n-1.0)**exp

    return n if invert is not True else 1.0-n

def floorInt(value):
    return int(math.floor(value))

def lerp(ab, amount):
    a, b = ab
    return (b-a) * amount + a

def lim(value, ab=(0, 1)):
    a, b = ab
    return max(a, min(b, value))

def norm(value, ab, limit=False):
    a, b = ab
    n = 0.0
    if (b - a) != 0:
        n = 1.0 * (value - a) / (b - a)
    if limit:
        n = lim(n)
    return n

def parseNumber(string, alwaysFloat=False):
    try:
        num = float(string.replace(",",""))
        if "." not in string and not alwaysFloat:
            num = int(string.replace(",",""))
        return num
    except ValueError:
        return string

def parseNumbers(arr):
    for i, item in enumerate(arr):
        if isinstance(item, (list,)):
            for j, v in enumerate(item):
                arr[i][j] = parseNumber(v)
        else:
            for key in item:
                if key != "id":
                    arr[i][key] = parseNumber(item[key])
    return arr

def roundInt(value):
    return int(round(value))

def translatePoint(x, y, distance, radians):
    x2 = x + distance * math.cos(radians)
    y2 = y + distance * math.sin(radians)
    return (x2, y2)
