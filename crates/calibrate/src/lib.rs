use aws_config::from_env;
use aws_sdk_sqs::Client as SqsClient;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::{
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use serde::Serialize;
use serde_json::to_string;

use tower_service::Service;
use worker::*;

fn router() -> Router {
    Router::new()
        .route("/", get(root))
        .route("/version", get(version))
        .route("/calibrate", post(calibrate))
}

async fn root() -> &'static str {
    env!("CARGO_PKG_NAME")
}

#[derive(Serialize)]
struct Version {
    version: &'static str,
}

async fn version() -> Json<Version> {
    Json(Version {
        version: env!("CARGO_PKG_VERSION"),
    })
}

#[derive(Serialize, Deserialize)]
struct CalibrateRequest {
    #[serde(rename = "userId")]
    user_id: String,
    #[serde(rename = "datasetId")]
    dataset_id: String,
}

#[derive(Serialize)]
struct CalibrateResponse {
    status: String,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

// Send the incoming request body to the SQS queue `calibrate-queue`
async fn calibrate(Json(payload): Json<CalibrateRequest>) -> Response {
    let config = from_env().load().await;
    let client = SqsClient::new(&config);

    // Retrieve the queue URL for `calibrate-queue`
    let queue_url = match client
        .get_queue_url()
        .queue_name("calibrate-queue")
        .send()
        .await
    {
        Ok(resp) => match resp.queue_url() {
            Some(url) => url.to_string(),
            None => {
                console_error!("Queue URL not found in response");
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse {
                        error: "Queue URL not found in response".to_string(),
                    }),
                )
                    .into_response();
            }
        },
        Err(err) => {
            console_error!("Failed to get queue URL: {:?}", err);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: format!("Failed to get queue URL: {:?}", err),
                }),
            )
                .into_response();
        }
    };

    // Send the message containing the original request payload
    let send_result = client
        .send_message()
        .queue_url(queue_url)
        .message_body(to_string(&payload).unwrap())
        .send()
        .await;

    match send_result {
        Ok(_) => {
            return (
                StatusCode::OK,
                Json(CalibrateResponse {
                    status: "Calibration queued".to_string(),
                }),
            )
                .into_response();
        }
        Err(err) => {
            console_error!("Failed to send message to SQS: {:?}", err);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: format!("Failed to send message to SQS: {:?}", err),
                }),
            )
                .into_response();
        }
    }
}

#[event(fetch)]
async fn fetch(
    req: HttpRequest,
    _env: Env,
    _ctx: Context,
) -> Result<axum::http::Response<axum::body::Body>> {
    console_error_panic_hook::set_once();

    Ok(router().call(req).await?)
}
