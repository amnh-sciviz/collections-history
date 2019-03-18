# -*- coding: utf-8 -*-

# will generate interpolated/randomized collections data based on incomplete real data

import argparse
import json
from PIL import Image, ImageDraw
import math
import numpy as np
from pprint import pprint
import random
import sys

import lib.io_utils as io
import lib.math_utils as mu

# input
parser = argparse.ArgumentParser()
parser.add_argument('-in', dest="INPUT_FILE", default="data/report_data.csv", help="File for input")
parser.add_argument('-start', dest="START_YEAR", default=1869, type=int, help="Start year")
parser.add_argument('-end', dest="END_YEAR", default=2018, type=int, help="End year")
parser.add_argument('-out', dest="OUTPUT_FILE", default="data/collections.json", help="File for output")
a = parser.parse_args()

_, data = io.readCsv(a.INPUT_FILE)
data = sorted(data, key=lambda k: k["year"])
latest = data[-1]

divisions = ["invertebrate zoology", "paleontology", "vertibrate zoology", "anthropology", "physical sciences"]

# entry = mu.roundInt(latest[]/1000.0)
# drawDots("img/dots_circle_invertebrate.png", totalDots, dotW, highlightCount=entry)
# runningTotal = entry
#
# entry = mu.roundInt(latest["paleontology"]/1000.0)
# drawDots("img/dots_circle_paleontology.png", totalDots, dotW, highlightCount=entry, highlightColor=[217,64,107], highlightOffset=runningTotal)
# runningTotal += entry
#
# entry = mu.roundInt(latest["vertibrate zoology"]/1000.0)
# drawDots("img/dots_circle_vertibrate.png", totalDots, dotW, highlightCount=entry, highlightColor=[226,169,17], highlightOffset=runningTotal)
# runningTotal += entry
#
# entry = mu.roundInt(latest["anthropology"]/1000.0)
# drawDots("img/dots_circle_anthropology.png", totalDots, dotW, highlightCount=entry, highlightColor=[222,104,223], highlightOffset=runningTotal)
# runningTotal += entry
#
# entry = mu.roundInt(latest["physical sciences"]/1000.0)

annualData = [{"year": a.START_YEAR+i, "added": 0, "cumulative": 0, "breakdown": []} for i in range(a.END_YEAR-a.START_YEAR+1)]

# first populate with existing data
for i, d in enumerate(annualData):
    year = d["year"]
    matches = [r for r in data if r["year"]==year]
    match = matches[0] if len(matches) > 0 else False
    breakdown = []
    cumulative = 0

    if match:
        cumulative = match["collection"]
        for division in divisions:
            if division in match and match[division] != "":
                breakdown.append(match[division])
        if len(breakdown) > 0:
            breakdown.append(cumulative-sum(breakdown))
        annualData[i]["cumulative"] = cumulative
        annualData[i]["breakdown"] = breakdown

# fill in the remainder data
model = annualData[-1]
for i, d in enumerate(annualData):
    if i > 0 and d["cumulative"] < 1:
        n = 1.0 * i / (len(annualData)-1)
        nEased = mu.ease(n, "quadIn")
        cumulative = mu.roundInt(nEased * model["cumulative"])
        annualData[i]["cumulative"] = cumulative

# add some randomness to the data
for i, d in enumerate(annualData):
    if i > 1 and i < len(annualData)-1:
        prev = annualData[i-1]
        delta = d["cumulative"] - prev["cumulative"]
        if delta > 0:
            half = mu.roundInt(delta * 0.5)
            random.seed(i)
            rdelta = random.randint(-int(half/2), int(half/2))
            annualData[i-1]["cumulative"] += rdelta
            annualData[i]["cumulative"] -= rdelta

# ensure each year increases
for i, d in enumerate(annualData):
    if i > 0:
        curr = annualData[i]["cumulative"]
        prev = annualData[i-1]["cumulative"]
        if prev > curr:
            annualData[i-1]["cumulative"] = curr
            annualData[i]["cumulative"] = prev

nbreakdown = [1.0*d/model["cumulative"] for d in model["breakdown"]]

# add breakdowns and added
for i, d in enumerate(annualData):
    breakdown = d["breakdown"]
    cumulative = d["cumulative"]
    if len(breakdown) < 1:
        for n in nbreakdown:
            breakdown.append(mu.roundInt(n*cumulative))
        annualData[i]["breakdown"] = breakdown
    if i > 0:
        prev = annualData[i-1]["cumulative"]
        annualData[i]["added"] = cumulative-prev

# from matplotlib import pyplot as plt
# ys = [d["added"] for d in annualData]
# xs = np.arange(len(ys))
# plt.scatter(xs, ys, s=4)
# plt.show()
# sys.exit()

with open(a.OUTPUT_FILE, 'w') as f:
    json.dump(annualData, f)

print("Done.")

# def drawDots(filename, count, dotW, imgW=1920, imgH=1080, color=[131, 138, 142], margin=10, maxDistance=None, highlightCount=0, highlightColor=[86,171,63], highlightOffset=0):
#     baseImage = Image.new('RGBA', (imgW, imgH), (0,0,0,255))
#     draw = ImageDraw.Draw(baseImage)
#     maxDistance = min(imgW, imgH) / 2 - margin if maxDistance is None else maxDistance
#     cx = imgW * 0.5
#     cy = imgH * 0.5
#     hDotW = dotW * 0.5
#     queue = []
#     for i in range(count):
#         random.seed(i*3)
#         distance = random.random() * maxDistance
#         random.seed(i*3+1)
#         radians = random.random() * 2.0 * math.pi
#         random.seed(i*3+2)
#         alpha = mu.roundInt(mu.lerp((20, 255), random.random()))
#         dotcolor = color[:] + [alpha]
#         highlighted = 0
#         if highlightCount > 0:
#             if highlightOffset <= i <  highlightCount+highlightOffset:
#                 highlighted = 1
#                 dotcolor = highlightColor[:] + [255]
#             else:
#                 dotcolor[3] = mu.roundInt(dotcolor[3] * 0.3)
#         x, y = mu.translatePoint(cx, cy, distance, radians)
#         xy1 = (mu.roundInt(x-hDotW), mu.roundInt(y-hDotW))
#         xy2 = (mu.roundInt(x+hDotW), mu.roundInt(y+hDotW))
#
#         queue.append((xy1, xy2, dotcolor, highlighted))
#     queue = sorted(queue, key=lambda k: (k[3], k[2][3]))
#     for xy1, xy2, dotcolor, highlighted in queue:
#         draw.ellipse((xy1, xy2), fill=tuple(dotcolor))
#     baseImage.save(filename)
#     print("Saved %s" % filename)
#
# dotW = 2
# totalDots = mu.roundInt(latest["collection"]/1000.0)
# drawDots("img/dots_circle_all.png", totalDots, dotW)
#
# entry = mu.roundInt(latest["invertebrate zoology"]/1000.0)
# drawDots("img/dots_circle_invertebrate.png", totalDots, dotW, highlightCount=entry)
# runningTotal = entry
#
# entry = mu.roundInt(latest["paleontology"]/1000.0)
# drawDots("img/dots_circle_paleontology.png", totalDots, dotW, highlightCount=entry, highlightColor=[217,64,107], highlightOffset=runningTotal)
# runningTotal += entry
#
# entry = mu.roundInt(latest["vertibrate zoology"]/1000.0)
# drawDots("img/dots_circle_vertibrate.png", totalDots, dotW, highlightCount=entry, highlightColor=[226,169,17], highlightOffset=runningTotal)
# runningTotal += entry
#
# entry = mu.roundInt(latest["anthropology"]/1000.0)
# drawDots("img/dots_circle_anthropology.png", totalDots, dotW, highlightCount=entry, highlightColor=[222,104,223], highlightOffset=runningTotal)
# runningTotal += entry
#
# entry = mu.roundInt(latest["physical sciences"]/1000.0)
# drawDots("img/dots_circle_physical.png", totalDots, dotW, highlightCount=entry, highlightColor=[255,240,0], highlightOffset=runningTotal)
# runningTotal += entry
