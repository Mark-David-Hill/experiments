from scipy.signal import convolve2d
import matplotlib.pyplot as plt
from PIL import Image
import numpy as np

def load_image(image_path):
    img = Image.open(image_path)
    return img

def display_image(img, cmap=None, flip=False):
    if flip:
        img = np.flip(img, axis=1)
    plt.imshow(img, cmap=cmap)
    plt.axis('off')
    plt.show()

img = load_image('daxi.jpeg')

img_array = np.array(img)
gray_img = np.mean(img_array, axis=2).astype(np.uint8)
flipped_img = np.flip(gray_img, axis=1)

# display_image(img_array)
# display_image(gray_img, cmap='gray')
display_image(gray_img, cmap='gray', flip=True)

Image.fromarray(flipped_img).save('flipped.jpeg')
