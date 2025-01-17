# Import our general libraries
import sys
import time

# Import the CodeProject.AI SDK. This will add to the PATH var for future imports
sys.path.append("../../SDK/Python")
from common import JSON
from request_data import RequestData
from module_runner import ModuleRunner
from module_options import ModuleOptions

from options import Options

from PIL import Image

# Import the method of the module we're wrapping
from OCR import init_detect_ocr, read_text

class OCR_adapter(ModuleRunner):

    def __init__(self):
        super().__init__()
        self.opts = Options()

    def initialise(self) -> None:
        self.can_use_GPU = self.system_info.hasPaddleGPU

        # HACK: We're seeing problems with GPU support on older cards. Allow
        # some checks to be done
        if self.system_info.hasPaddleGPU:
            import paddle

            if not paddle.device.cuda.device_count() or \
                paddle.device.cuda.get_device_capability()[0] < self.opts.min_compute_capability:
                self.can_use_GPU = False

            if paddle.device.get_cudnn_version() / 100.0 < self.opts.min_cuDNN_version: 
                self.can_use_GPU = False
        # end hack

        self.opts.use_gpu = self.enable_GPU and self.can_use_GPU

        if self.opts.use_gpu:
            self.processor_type     = "GPU"
            self.execution_provider = "CUDA"   # PaddleOCR supports only CUDA enabled GPUs at this point

        init_detect_ocr(self.opts)

    def process(self, data: RequestData) -> JSON:
        try:
            image: Image = data.get_image(0)

            start_time = time.perf_counter()

            result = read_text(self, image)

            if "error" in result and result["error"]:
                return { "success": False, "error": result["error"] }

            predictions = result["predictions"]
            message = "1 text found" if len(predictions) == 1 else f"{len(predictions)} pieces of text found"

            return {
                "success":     True,
                "predictions": result["predictions"],
                "message":     message,
                "processMs":   int((time.perf_counter() - start_time) * 1000),
                "inferenceMs": result["inferenceMs"]
            }

        except Exception as ex:
            self.report_error(ex, __file__)
            return { "success": False, "error": "unable to process the image" }


    def selftest(slf) -> JSON:
        try:
            import paddle
            paddle.utils.run_check()
            return { "success": True, "message": "PaddlePaddle self test successful" }
        except:
            return { "success": False, "message": "PaddlePaddle self test failed" }
        

    def cleanup(self) -> None:
        pass

if __name__ == "__main__":
    OCR_adapter().start_loop()
