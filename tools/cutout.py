"""Cuts the fake checkerboard background out of AI-generated art.
Usage: python tools/cutout.py input.jpg output.png [--fill-holes]
"""
import numpy as np, sys
from PIL import Image, ImageFilter
from scipy import ndimage as nd
src,dst=sys.argv[1],sys.argv[2]
fill='--fill-holes' in sys.argv
if True:
    a=np.asarray(Image.open(src).convert('RGB')).astype(int)
    mx,mn=a.max(2),a.min(2)
    light=(mx-mn<28)&(mn>165)                    # checkerboard / white streak pixels
    lab,_=nd.label(light)
    edge=set(np.unique(np.r_[lab[0],lab[-1],lab[:,0],lab[:,-1]]))-{0}
    bg=np.isin(lab,list(edge))
    br=mn
    for i in range(1,lab.max()+1):              # enclosed checkerboard (e.g. inside headphone bands)
        if i in edge: continue
        m=lab==i; n=m.sum()
        if n<250: continue
        v=br[m]
        if (v<228).mean()>.15 and (v>245).mean()>.15: bg|=m
    fg=~bg
    fg=nd.binary_opening(fg,iterations=2)        # kill leftover specks
    lab2,n=nd.label(fg); sizes=nd.sum(fg,lab2,range(1,n+1))
    keep=np.isin(lab2,1+np.where(sizes>=sizes.max()*0.02)[0])
    keep=nd.binary_fill_holes(keep) if fill else keep
    keep=nd.binary_erosion(keep,iterations=1)     # trim jpeg halo
    alpha=Image.fromarray((keep*255).astype('uint8')).filter(ImageFilter.GaussianBlur(0.8))
    im=Image.fromarray(a.astype('uint8')).convert('RGBA'); im.putalpha(alpha)
    im=im.crop(im.getbbox())
    im.thumbnail((600,600),Image.LANCZOS)
    im.save(dst,optimize=True); print(dst,im.size)
