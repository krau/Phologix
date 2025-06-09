import argparse
import io

import pillow_avif  # noqa: F401
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from predict import predict
from pydantic import BaseModel

app = FastAPI(title="KonaTagger", version="0.1.0")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PredictImageRequest(BaseModel):
    file_path: str


@app.post(
    "/predict",
    summary="图像标注接口",
    description="接收图像并返回预测的标签和置信度分数",
)
async def predict_image(request: PredictImageRequest):
    try:
        with open(request.file_path, "rb") as file:
            contents = file.read()
        # 转为 jpg 格式
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        predicted_tags, scores = await predict(image)

        scores = {k: float(v) for k, v in scores.items() if k in predicted_tags}
        sorted_scores = dict(
            sorted(scores.items(), key=lambda item: item[1], reverse=True)
        )

        return {
            "predicted_tags": predicted_tags,
            "scores": sorted_scores,
            "file_path": request.file_path,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"处理过程中发生错误: {str(e)}")


@app.post("/predict/batch")
async def predict_batch(files: list[str]):
    """
    批量处理图像文件，返回每个文件的预测标签和分数
    """
    results = []
    for file_path in files:
        try:
            with open(file_path, "rb") as file:
                contents = file.read()
            # 转为 jpg 格式
            image = Image.open(io.BytesIO(contents)).convert("RGB")
            predicted_tags, scores = await predict(image)

            scores = {k: float(v) for k, v in scores.items() if k in predicted_tags}
            sorted_scores = dict(
                sorted(scores.items(), key=lambda item: item[1], reverse=True)
            )
            results.append(
                {
                    "file_path": file_path,
                    "predicted_tags": predicted_tags,
                    "scores": sorted_scores,
                }
            )
        except Exception as e:
            results.append({"file_path": file_path, "error": str(e)})

    return results


@app.get("/health", include_in_schema=False)
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, help="Port to listen on")
    args = parser.parse_args()
    port = args.port if args.port else 39147
    print("SERVER_READY", flush=True)
    uvicorn.run(
        app,
        port=port,
    )
