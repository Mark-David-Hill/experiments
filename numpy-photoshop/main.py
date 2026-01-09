import matplotlib.pyplot as plt
from PIL import Image
import numpy as np

def to_grayscale(img_array):
    grayscale_img = np.mean(img_array, axis=2).astype(np.uint8)
    return np.stack((grayscale_img, grayscale_img, grayscale_img), axis=2)

def to_sepia(img_array):
    sepia_filter = np.array([[0.393, 0.769, 0.189], 
    [0.349, 0.686, 0.168], 
    [0.272, 0.534, 0.131]])
    sepia = img_array @ sepia_filter.T
    sepia = np.clip(sepia, 0, 255)
    return sepia.astype(np.uint8)

def invert_colors(img_array):
    return 255 - img_array

def blur(arr, k=3):
    """
    Blur the image using a k x k average filter.
    k must be an odd number (3, 5, 7, ...).
    """
    if k % 2 == 0:
        raise ValueError("Kernel size k must be odd (3, 5, 7, ...).")

    pad = k // 2
    padded = np.pad(arr, ((pad,pad), (pad,pad), (0,0)), mode="edge")
    blurred = np.zeros_like(arr)

    for i in range(3):  # loop over RGB channels
        # Sum up k×k shifted slices
        total = np.zeros_like(arr[:,:,i], dtype=np.int32)
        for dx in range(k):
            for dy in range(k):
                total += padded[dx:dx+arr.shape[0], dy:dy+arr.shape[1], i]

        blurred[:,:,i] = (total // (k*k))

    return blurred.astype(np.uint8)


img = Image.open('daxi.jpeg')
img_array = np.array(img)

plt.imshow(blur(img_array, k=11))
plt.axis('off')
plt.show()

plt.imshow(img_array)
plt.axis('off')
plt.show()