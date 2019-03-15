import csv
import json
import os
import re
import requests
import shutil
from urllib.parse import urlparse

import lib.math_utils as mu

def downloadBinaryFile(url, dir, filename, overwrite=False):
    if filename is None:
        filename = getFilenameFromUrl(url)
    if len(filename) <= 0:
        print("Please indicate a filename for %s" % url)
        return False

    filename = dir + filename

    if os.path.isfile(filename) and not overwrite:
        print("%s already exists." % filename)
        return True

    print("Downloading %s..." % url)
    response = requests.get(url, stream=True)
    with open(filename, 'wb') as f:
        shutil.copyfileobj(response.raw, f)
    del response

def downloadFile(url, dir, filename=None, save=True, overwrite=False):
    if filename is None:
        filename = getFilenameFromUrl(url)
    if len(filename) <= 0:
        filename = "file.dat"

    filename = dir + filename
    contents = ""
    isJSON = filename.endswith(".json")

    if os.path.isfile(filename) and not overwrite:
        print("%s already exists." % filename)
        with open(filename, "r") as f:
            if isJSON:
                contents = json.load(f)
            else:
                contents = f.read()
        return contents

    r = requests.get(url)
    contents = r.json() if isJSON else r.text
    print("Downloading %s to %s" % (url, filename))

    if save:
        with open(filename, "w") as f:
            if isJSON:
                json.dump(contents, f)
            else:
                f.write(contents)

    return contents

def getFileBasename(filename):
    basename = os.path.basename(filename)
    ext = getFileext(basename)
    return basename[:-len(ext)]

def getFileext(filename):
    return "." + filename.split(".")[-1]

def getFileextFromUrl(url):
    filename = getFilenameFromUrl(url)
    return getFileext(filename)

def getFilenameFromUrl(url):
    urlObj = urlparse(url)
    return os.path.basename(urlObj.path)

def makeDirectories(filenames):
    if not isinstance(filenames, list):
        filenames = [filenames]
    for filename in filenames:
        dirname = os.path.dirname(filename)
        if not os.path.exists(dirname):
            os.makedirs(dirname)

def readCsv(filename, headings=False, verbose=True):
    rows = []
    fieldnames = []
    if os.path.isfile(filename):
        with open(filename, 'r', encoding="utf8") as f:
            lines = list(f)
            reader = csv.DictReader(lines, skipinitialspace=True)
            if len(lines) > 0:
                fieldnames = list(reader.fieldnames)
            rows = list(reader)
            rows = mu.parseNumbers(rows)
            if verbose:
                print("Read %s rows from %s" % (len(rows), filename))
    return (fieldnames, rows)

def writeCsv(filename, arr, headings="auto", append=False, verbose=True):
    if headings == "auto":
        headings = arr[0].keys()
    mode = 'w' if not append else "a"

    with open(filename, mode, encoding="utf8") as f:

        writer = csv.writer(f)
        if not append:
            writer.writerow(headings)

        for i, d in enumerate(arr):
            row = []
            for h in headings:
                value = ""
                if h in d:
                    value = d[h]
                    if isinstance(value, str):
                        value = re.sub('\s+', ' ', value).strip() # clean whitespaces
                row.append(value)
            writer.writerow(row)

        if verbose:
            print("Wrote %s rows to %s" % (len(arr), filename))
