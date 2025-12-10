#vẽ các hình cơ bản lên ảnh 
import cv2

img = cv2.imread('D:\\UTH-CVIP-assignments\\Solutions\\Lab 1\\Requirements-lab1.png')
cv2.line(img,(0,0),(200,321),(255,0,0),5)   #đường thẳng
cv2.rectangle(img,(324,420),(510,128),(0,255,0),3)  #hình chữ nhật
cv2.circle(img,(420,120), 63, (0,0,255), 1)  #hình tròn (1 là viền, -1 là tô màu)
cv2.ellipse(img,(256,256),(100,50),0,0,120,255,-1)  #hình elip
cv2.imshow('Drawing shape', img)
cv2.imwrite('D:\\UTH-CVIP-assignments\\Solutions\\Lab 1\\Exercise 5\\result.png', img)
cv2.waitKey(0)
cv2.destroyAllWindows()