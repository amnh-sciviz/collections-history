# -*- coding: utf-8 -*-

import argparse
import glob
from PIL import Image
from pprint import pprint
import random
import sys

# input
parser = argparse.ArgumentParser()
parser.add_argument('-in', dest="INPUT_FILES", default="downloads/specimens/*.jpg", help="Input file pattern")
parser.add_argument('-tile', dest="TILE_SIZE", default="128x128", help="Tile size in pixels")
parser.add_argument('-grid', dest="GRID_SIZE", default="8x128", help="Grid size in cols x rows")
parser.add_argument('-out', dest="OUTPUT_FILE", default="img/specimen_spritesheet.jpg", help="File for output")
a = parser.parse_args()

tileW, tileH = tuple([int(t) for t in a.TILE_SIZE.split("x")])
gridW, gridH = tuple([int(t) for t in a.GRID_SIZE.split("x")])
imgW, imgH = (gridW * tileW, gridH * tileH)
tileCount = gridW * gridH

baseImage = Image.new('RGB', (imgW, imgH), (0,0,0))
filenames = glob.glob(a.INPUT_FILES)

# randomly select x images
if len(filenames) > tileCount:
    random.seed(7)
    random.shuffle(filenames)
    filenames = filenames[:tileCount]

def fillImage(img, w, h):
    vw, vh = img.size
    if vw == w and vh == h:
        return img

    # first, resize video
    ratio = 1.0 * w / h
    vratio = 1.0 * vw / vh
    newW = w
    newH = h
    if vratio > ratio:
        newW = h * vratio
    else:
        newH = w / vratio
    # Lanczos = good for downsizing
    resized = img.resize((int(round(newW)), int(round(newH))), resample=Image.LANCZOS)

    # and then crop
    x = 0
    y = 0
    if vratio > ratio:
        x = int(round((newW - w) * 0.5))
    else:
        y = int(round((newH - h) * 0.5))
    x1 = x + w
    y1 = y + h
    cropped = resized.crop((x, y, x1, y1))

    return cropped

print("Building spritesheet...")
mask = Image.open("img/particle_mask.png")
mask = mask.convert("RGBA")
mask = mask.resize((tileW, tileH), resample=Image.LANCZOS)
for row in range(gridH):
    for col in range(gridW):
        # open file
        i = row * gridW + col
        filename = filenames[i]
        im = Image.open(filename)
        im = im.convert("RGBA")
        # resize image
        im = fillImage(im, tileW, tileH)
        # add circular mask
        im = Image.alpha_composite(im, mask)
        # paste image
        x = col * tileW
        y = row * tileH
        baseImage.paste(im, (x, y))

        sys.stdout.write('\r')
        sys.stdout.write("%s%%" % round(1.0*(i+1)/tileCount*100,2))
        sys.stdout.flush()

print("Saving image...")
baseImage.save(a.OUTPUT_FILE)
print("Created %s" % a.OUTPUT_FILE)
