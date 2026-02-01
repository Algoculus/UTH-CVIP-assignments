# Báo cáo Bài thực hành 4: So sánh sự tương đồng của các hình ảnh sử dụng Wavelet

---

## Mục lục

1. [I. Mục tiêu bài tập](#i-mục-tiêu-bài-tập)
2. [II. Bài toán cụ thể](#ii-bài-toán-cụ-thể)
    - [II.1 Chuẩn bị dữ liệu](#ii1-chuẩn-bị-dữ-liệu)
    - [II.2 Trích xuất đặc trưng wavelet](#ii2-trích-xuất-đặc-trưng-wavelet)
    - [II.3 Tạo mã băm wavelet](#ii3-tạo-mã-băm-wavelet)
    - [II.4 So sánh hàm băm bằng khoảng cách Hamming](#ii4-so-sánh-hàm-băm-bằng-khoảng-cách-hamming)
    - [II.5 Đánh giá hiệu suất](#ii5-đánh-giá-hiệu-suất)
3. [III. Bài tập nâng cao](#iii-bài-tập-nâng-cao)
    - [III.1 So sánh các phương pháp băm wavelet](#iii1-so-sánh-các-phương-pháp-băm-wavelet)
    - [III.2 Ứng dụng tìm kiếm hình ảnh](#iii2-ứng-dụng-tìm-kiếm-hình-ảnh)
4. [IV. Kết luận](#iv-kết-luận)
5. [Lời cảm ơn](#lời-cảm-ơn)

---

## I. Mục tiêu bài tập

Bài thực hành này tập trung vào việc áp dụng biến đổi wavelet để trích xuất đặc trưng từ hình ảnh và so sánh mức độ tương đồng giữa các cặp ảnh.

Mục tiêu cụ thể bao gồm ba nội dung chính. Thứ nhất là nắm vững cách sử dụng biến đổi wavelet rời rạc hai chiều (DWT 2D) để phân tích hình ảnh thành các thành phần tần số khác nhau. Thứ hai là làm quen với thư viện PyWavelets trong Python và các công cụ xử lý ảnh liên quan. Thứ ba là đánh giá hiệu quả của phương pháp wavelet hash trong việc xác định các hình ảnh tương tự thông qua các độ đo định lượng.

Phương pháp tổng quát được thể hiện qua sơ đồ sau: ảnh gốc được tiền xử lý, sau đó áp dụng biến đổi DWT để thu được các hệ số wavelet, trích xuất subband phù hợp, lượng tử hóa thành chuỗi bit để tạo mã băm, và cuối cùng so sánh các mã băm bằng khoảng cách Hamming.

---

## II. Bài toán cụ thể

### II.1 Chuẩn bị dữ liệu

Việc chuẩn bị dữ liệu được thực hiện thông qua hàm `generate_synthetic_pairs` trong module `src/preprocessing.py`. Hàm này tự động tạo tập dữ liệu test từ các ảnh mẫu có sẵn trong thư viện scikit-image.

Để tạo các cặp ảnh tương tự, hàm lấy một ảnh gốc và tạo biến thể bằng cách thêm nhiễu Gaussian hoặc điều chỉnh độ sáng. Quá trình này sử dụng hàm nội bộ `add_noise` với độ lệch chuẩn mặc định là 10 và hàm `adjust_brightness` với hệ số trong khoảng từ 0.7 đến 1.3.

Để tạo các cặp ảnh không tương tự, hàm chọn ngẫu nhiên hai ảnh từ các danh mục khác nhau trong bộ ảnh mẫu. Các ảnh được sử dụng bao gồm camera, astronaut, coins, moon, coffee và các ảnh khác từ `skimage.data`.

Tham số `num_similar` và `num_dissimilar` cho phép kiểm soát số lượng cặp ảnh thuộc mỗi loại. Giá trị mặc định là 10 cặp tương tự và 10 cặp không tương tự, tổng cộng 20 cặp ảnh để đánh giá.

< chèn ảnh sample_pairs.png vào đây >

Hình trên minh họa một số cặp ảnh mẫu trong tập dữ liệu. Các cặp được đánh dấu màu xanh là cặp tương tự (label=1) và màu đỏ là cặp không tương tự (label=0).

---

### II.2 Trích xuất đặc trưng wavelet

Biến đổi wavelet rời rạc hai chiều được thực hiện thông qua hàm `dwt2` trong module `src/wavelet_hash.py`. Hàm này gọi `pywt.wavedec2` từ thư viện PyWavelets để phân rã ảnh thành các thành phần tần số theo nhiều cấp độ.

Cấu hình mặc định sử dụng wavelet Haar với level 2. Wavelet Haar được chọn vì tính đơn giản và tốc độ xử lý nhanh, phù hợp cho bài toán so sánh ảnh cơ bản. Level 2 cho phép cân bằng giữa độ ổn định của đặc trưng và mức độ chi tiết được giữ lại.

Kết quả phân rã DWT bao gồm các thành phần sau. Thành phần cA (Approximation) chứa thông tin tần số thấp, đại diện cho cấu trúc chính của ảnh. Thành phần cH (Horizontal detail) chứa các chi tiết theo chiều ngang, phát hiện các cạnh nằm ngang. Thành phần cV (Vertical detail) chứa các chi tiết theo chiều dọc, phát hiện các cạnh đứng. Thành phần cD (Diagonal detail) chứa các chi tiết theo đường chéo.

< chèn ảnh wavelet_decomposition.png vào đây >

Hình trên hiển thị kết quả phân rã wavelet của một ảnh mẫu. Panel bên trái là ảnh gốc, panel giữa là toàn bộ các hệ số wavelet được ghép lại, và panel bên phải là subband LL (Approximation) tại cấp phân rã cao nhất.

Hàm `get_feature_vector` cho phép lựa chọn subband để trích xuất đặc trưng. Chế độ "LL" chỉ lấy thành phần approximation, đây là lựa chọn ổn định nhất cho việc so sánh ảnh. Các chế độ khác như "LL_LH", "LL_HL", hoặc "ALL" cho phép kết hợp thêm các thành phần chi tiết nếu cần.

---

### II.3 Tạo mã băm wavelet

Quá trình tạo mã băm được thực hiện trong hàm `wavelet_hash` của module `src/wavelet_hash.py`. Hàm này nhận đầu vào là ảnh (dạng path hoặc numpy array) và trả về dictionary chứa mã băm dưới dạng bit array, hexadecimal string, và các thông tin bổ sung.

Bước đầu tiên là tiền xử lý ảnh thông qua hàm `load_image_array` trong module `src/preprocessing.py`. Ảnh được chuyển sang grayscale nếu cần và resize về kích thước chuẩn 256x256 pixel. Việc chuẩn hóa kích thước đảm bảo rằng các hash có thể so sánh được với nhau bất kể kích thước ảnh gốc.

Bước thứ hai là phân rã wavelet sử dụng hàm `dwt2` như đã mô tả ở phần trước. Các hệ số wavelet được trích xuất theo cấu hình đã chọn.

Bước thứ ba là lượng tử hóa các hệ số thành chuỗi bit thông qua hàm `quantize_to_bits`. Phương pháp lượng tử hóa mặc định là "median", trong đó mỗi hệ số được so sánh với giá trị median của toàn bộ vector đặc trưng. Nếu hệ số lớn hơn median thì bit tương ứng có giá trị 1, ngược lại có giá trị 0.

Phương pháp "mean" hoạt động tương tự nhưng sử dụng giá trị trung bình thay vì median. Phương pháp "median" thường robust hơn với các outlier trong dữ liệu.

Độ dài hash mặc định là 256 bit. Nếu vector đặc trưng có kích thước khác, hàm sẽ tự động điều chỉnh bằng cách cắt bớt hoặc padding để đạt được độ dài mong muốn.

---

### II.4 So sánh hàm băm bằng khoảng cách Hamming

Khoảng cách Hamming được tính toán trong hàm `hamming_distance` của module `src/metrics.py`. Đây là số bit khác nhau giữa hai mã băm, được tính bằng cách đếm số vị trí mà hai chuỗi bit có giá trị không giống nhau.

Công thức tính như sau: với hai hash H1 và H2 có cùng độ dài n bit, khoảng cách Hamming d(H1, H2) bằng tổng của các vị trí i mà H1[i] khác H2[i].

Khoảng cách Hamming nhỏ cho thấy hai ảnh có độ tương đồng cao. Ngược lại, khoảng cách lớn cho thấy hai ảnh khác nhau đáng kể. Với hash 256 bit, khoảng cách có thể nằm trong khoảng từ 0 đến 256.

Để phân loại một cặp ảnh là tương tự hay không, cần xác định một ngưỡng threshold. Nếu khoảng cách nhỏ hơn hoặc bằng threshold thì cặp ảnh được dự đoán là tương tự (label=1), ngược lại là không tương tự (label=0).

Hàm `calculate_metrics` tính toán các độ đo đánh giá tại một ngưỡng cụ thể. Hàm trả về các giá trị bao gồm Accuracy, Sensitivity (True Positive Rate), Specificity (True Negative Rate), Precision, F1-Score và confusion matrix.

< chèn ảnh distance_distribution.png vào đây >

Hình trên hiển thị phân bố khoảng cách Hamming cho hai nhóm cặp ảnh. Histogram bên trái cho thấy sự chồng chéo giữa hai phân bố. Boxplot bên phải minh họa khoảng biến thiên của mỗi nhóm. Điểm lý tưởng là khi hai phân bố tách biệt hoàn toàn.

---

### II.5 Đánh giá hiệu suất

Việc đánh giá hiệu suất được thực hiện thông qua nhiều độ đo và phương pháp phân tích. Các độ đo chính bao gồm Accuracy, Sensitivity, Specificity và AUC.

**Accuracy** là tỷ lệ phân loại đúng trên tổng số cặp ảnh. Công thức tính là (TP + TN) / (TP + TN + FP + FN) trong đó TP là True Positive, TN là True Negative, FP là False Positive và FN là False Negative.

**Sensitivity** (hay Recall, True Positive Rate) là tỷ lệ các cặp ảnh tương tự được phát hiện đúng. Công thức tính là TP / (TP + FN). Độ đo này quan trọng khi cần đảm bảo không bỏ sót các cặp ảnh giống nhau.

**Specificity** (True Negative Rate) là tỷ lệ các cặp ảnh không tương tự được phân loại đúng. Công thức tính là TN / (TN + FP). Độ đo này quan trọng khi cần tránh nhầm lẫn các ảnh khác nhau thành giống nhau.

Hàm `find_optimal_threshold` trong module `src/metrics.py` tìm ngưỡng tối ưu theo tiêu chí được chỉ định. Tiêu chí mặc định là "accuracy", tức là tìm ngưỡng cho Accuracy cao nhất. Các tiêu chí khác bao gồm "youden" (tối đa hóa TPR minus FPR) và "f1" (tối đa hóa F1-Score).

Quá trình tìm ngưỡng hoạt động như sau. Đầu tiên, tạo một dãy các giá trị threshold từ giá trị nhỏ nhất đến lớn nhất của khoảng cách Hamming. Tiếp theo, tính các độ đo tại mỗi threshold. Cuối cùng, chọn threshold cho giá trị tiêu chí tốt nhất.

< chèn ảnh confusion_matrix.png vào đây >

Hình trên hiển thị confusion matrix tại ngưỡng tối ưu. Các ô màu đậm trên đường chéo chính thể hiện các trường hợp phân loại đúng. Các ô ngoài đường chéo là các trường hợp phân loại sai.

**Đường cong ROC** (Receiver Operating Characteristic) biểu diễn mối quan hệ giữa True Positive Rate (trục y) và False Positive Rate (trục x) khi thay đổi ngưỡng phân loại. Hàm `compute_roc_auc` trong module `src/metrics.py` tính toán đường cong này và diện tích dưới đường cong (AUC).

Vì khoảng cách Hamming nhỏ tương ứng với ảnh tương tự (positive), cần đổi dấu khoảng cách trước khi đưa vào hàm `roc_curve` của scikit-learn. Điều này đảm bảo rằng score cao tương ứng với dự đoán positive.

AUC có giá trị từ 0 đến 1. AUC bằng 0.5 tương ứng với phân loại ngẫu nhiên. AUC lớn hơn 0.9 được coi là xuất sắc. AUC từ 0.8 đến 0.9 là tốt. AUC từ 0.7 đến 0.8 là khá.

< chèn ảnh roc_curve.png vào đây >

Hình trên hiển thị đường cong ROC cho thuật toán wavelet hash. Đường màu cam là ROC curve thực tế với giá trị AUC được ghi chú. Đường đứt nét màu xanh đậm là đường tham chiếu cho phân loại ngẫu nhiên (AUC = 0.5). Điểm đỏ đánh dấu vị trí optimal theo tiêu chí Youden's Index.

< chèn ảnh metrics_vs_threshold.png vào đây >

Hình trên hiển thị sự thay đổi của các độ đo theo ngưỡng threshold. Bốn panel hiển thị Accuracy, Sensitivity, Specificity và F1-Score. Đường đỏ đứt nét đánh dấu vị trí ngưỡng tối ưu.

---

## III. Bài tập nâng cao

### III.1 So sánh các phương pháp băm wavelet

Phần này thực hiện khảo sát có hệ thống về ảnh hưởng của các tham số cấu hình đến hiệu suất của thuật toán wavelet hash. Hàm `create_method_configs` tạo danh sách các cấu hình cần khảo sát.

**Khảo sát loại wavelet**: Bốn loại wavelet được so sánh bao gồm Haar, Daubechies 2 (db2), Daubechies 4 (db4) và Symlets 2 (sym2). Haar là wavelet đơn giản nhất với bộ lọc hai hệ số. Daubechies và Symlets có độ mượt cao hơn nhưng phức tạp hơn về mặt tính toán.

**Khảo sát cấp phân rã**: Ba mức độ level được thử nghiệm là 1, 2 và 3. Level cao hơn cho subband approximation nhỏ hơn (về kích thước) nhưng chứa thông tin tổng quát hơn. Level thấp hơn giữ lại nhiều chi tiết hơn nhưng có thể nhạy với nhiễu.

**Khảo sát phương pháp lượng tử**: Hai phương pháp được so sánh là median và mean thresholding. Median robust hơn với các giá trị ngoại lai trong dữ liệu.

**Khảo sát chế độ subband**: Ba chế độ được thử nghiệm là LL (chỉ approximation), LL_LH (approximation kết hợp horizontal detail) và ALL (tất cả các band).

Quá trình khảo sát được thực hiện như sau. Với mỗi cấu hình, tính hash cho tất cả các cặp ảnh trong tập dữ liệu. Sau đó tính khoảng cách Hamming cho mỗi cặp. Tiếp theo tìm ngưỡng tối ưu và tính các độ đo đánh giá. Cuối cùng tính ROC AUC để có một số liệu tổng hợp về chất lượng phân loại.

Kết quả được lưu vào file `outputs/tables/methods_comparison.csv` với các cột bao gồm tên phương pháp, nhóm tham số, các giá trị Accuracy, Sensitivity, Specificity, F1-Score, AUC và ngưỡng tối ưu.

< chèn ảnh methods_comparison.png vào đây >

Hình trên hiển thị kết quả so sánh các phương pháp. Panel trên bên trái là biểu đồ thanh AUC theo phương pháp. Panel trên bên phải là biểu đồ cột nhóm cho các metrics. Panel dưới bên trái là các đường ROC của 5 phương pháp tốt nhất. Panel dưới bên phải là heatmap AUC theo wavelet và level.

Dựa trên kết quả khảo sát, có thể rút ra một số nhận xét. Wavelet Haar với level 2 và median thresholding là lựa chọn cân bằng tốt giữa hiệu suất và độ phức tạp. Các wavelet phức tạp hơn như db4 có thể cho kết quả tốt hơn trong một số trường hợp nhưng không phải lúc nào cũng vượt trội. Chế độ LL đủ tốt cho hầu hết các trường hợp và việc thêm các band chi tiết không nhất thiết cải thiện kết quả.

---

### III.2 Ứng dụng tìm kiếm hình ảnh

Phần này xây dựng ứng dụng tìm kiếm ảnh tương tự (image retrieval) dựa trên wavelet hash. Quy trình bao gồm ba bước chính: xây dựng gallery, tính hash cho ảnh query và tìm các ảnh gần nhất.

Hàm `build_hash_gallery_from_arrays` trong module `src/retrieval.py` xây dựng gallery hash từ danh sách ảnh. Với mỗi ảnh trong gallery, hàm tính wavelet hash và lưu kết quả vào dictionary với key là tên ảnh.

Gallery test được tạo từ các ảnh mẫu scikit-image bao gồm camera, astronaut, coins, moon, text, coffee, clock và horse. Ngoài ra còn có các biến thể như camera_noisy (thêm nhiễu), camera_bright (tăng độ sáng) và moon_dark (giảm độ sáng).

Hàm `image_retrieval_demo` thực hiện demo tìm kiếm. Đầu vào là ảnh query và gallery hash. Đầu ra là top-k ảnh có khoảng cách Hamming nhỏ nhất so với query.

Quá trình tìm kiếm hoạt động như sau. Đầu tiên, tính hash cho ảnh query sử dụng cùng cấu hình với gallery. Tiếp theo, tính khoảng cách Hamming giữa query hash và hash của mỗi ảnh trong gallery. Sau đó, sắp xếp các kết quả theo khoảng cách tăng dần. Cuối cùng, trả về top-k ảnh có khoảng cách nhỏ nhất.

< chèn ảnh retrieval_demo_camera.png vào đây >

Hình trên minh họa kết quả tìm kiếm với query là biến thể của ảnh camera. Panel đầu tiên là ảnh query. Các panel tiếp theo hiển thị top-5 kết quả với khoảng cách Hamming và độ tương đồng tương ứng.

< chèn ảnh retrieval_demo_moon.png vào đây >

Hình trên minh họa kết quả tìm kiếm với query là ảnh moon được xoay 90 độ. Kết quả cho thấy thuật toán có thể nhận diện ảnh moon và các biến thể mặc dù có sự khác biệt về góc xoay.

< chèn ảnh retrieval_demo_random.png vào đây >

Hình trên minh họa kết quả tìm kiếm với query là ảnh nhiễu ngẫu nhiên. Khoảng cách Hamming lớn với tất cả các ảnh trong gallery cho thấy thuật toán có thể phân biệt được ảnh không liên quan.

Hàm `search_similar_images` cung cấp giao diện đơn giản để thực hiện tìm kiếm. Người dùng có thể truyền đường dẫn ảnh hoặc numpy array và chỉ định số lượng kết quả mong muốn.

---

## IV. Kết luận

Bài thực hành đã hoàn thành các mục tiêu đề ra. Thuật toán wavelet hash đã được triển khai thành công với đầy đủ các thành phần từ tiền xử lý, biến đổi wavelet, lượng tử hóa đến so sánh hash.

Kết quả đánh giá cho thấy phương pháp wavelet hash hiệu quả trong việc phân biệt các cặp ảnh tương tự và không tương tự. Các độ đo Accuracy, Sensitivity, Specificity và AUC đều đạt giá trị tốt trên tập dữ liệu test.

Khảo sát tham số cho thấy cấu hình mặc định (Haar, level 2, median, LL) là lựa chọn hợp lý cho các bài toán cơ bản. Tùy thuộc vào yêu cầu cụ thể, có thể điều chỉnh các tham số để tối ưu hóa hiệu suất.

Ứng dụng tìm kiếm ảnh đã được xây dựng và demo thành công. Hệ thống có thể tìm các ảnh tương tự trong gallery dựa trên khoảng cách Hamming và trả về kết quả được xếp hạng.

---

## Lời cảm ơn

Nhóm chúng em xin chân thành cảm ơn thầy/cô đã hướng dẫn và hỗ trợ trong quá trình thực hiện bài thực hành này. Những góp ý và phản hồi từ thầy/cô đã giúp nhóm chúng em hoàn thiện bài làm và hiểu sâu hơn về các khái niệm trong xử lý ảnh và thị giác máy tính.

---

## Tài liệu tham khảo

1. Mallat, S. (1999). A Wavelet Tour of Signal Processing. Academic Press.
2. Lee, G. R., Gommers, R., Waselewski, F., Wohlfahrt, K., & O'Leary, A. (2019). PyWavelets: A Python package for wavelet analysis. Journal of Open Source Software, 4(36), 1237.
3. Scikit-image: Image processing in Python. https://scikit-image.org/
4. Van der Walt, S., Schönberger, J. L., Nunez-Iglesias, J., Boulogne, F., Warner, J. D., Yager, N., ... & Yu, T. (2014). scikit-image: image processing in Python. PeerJ, 2, e453.
