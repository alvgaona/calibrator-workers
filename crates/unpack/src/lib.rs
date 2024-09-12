use flate2::read::GzDecoder;
use serde::{Deserialize, Serialize};
use std::io::Read;
use tar::Archive;
use worker::*;

#[derive(Serialize, Debug, Clone, Deserialize)]
pub struct R2Event {
    account: String,
    action: String,
    bucket: String,
    object: CustomR2Object,
    #[serde(rename = "eventTime")]
    event_time: String,
    #[serde(rename = "copySource")]
    copy_source: Option<CopySource>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CustomR2Object {
    key: String,
    size: u32,
    #[serde(rename = "eTag")]
    etag: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CopySource {
    bucket: String,
    object: String,
}

#[event(queue)]
async fn main(message_batch: MessageBatch<R2Event>, env: Env, _context: Context) -> Result<()> {
    for message in message_batch.messages()? {
        let event = message.body();

        let src_bucket = env.bucket("CALIBRATOR_UPLOAD_BUCKET")?;
        let dst_bucket = env.bucket("CALIBRATOR_INPUT_BUCKET")?;
        let object = src_bucket.get(&event.object.key).execute().await?;

        let key_parts: Vec<&str> = event.object.key.split("/").collect();

        if key_parts.len() < 3 {
            console_error!(
                "Key does not adhere to the convention: {}",
                event.object.key
            );
            continue;
        }

        if let Some(object) = object {
            if let Some(object_contents) = object.body() {
                let buffer = object_contents.bytes().await?;

                // Decompress the gzip content
                let mut gz = GzDecoder::new(&buffer[..]);
                let mut decompressed = Vec::new();
                gz.read_to_end(&mut decompressed)?;

                // Unpack the tar archive
                let mut archive = Archive::new(&decompressed[..]);

                for entry in archive.entries()? {
                    let mut entry = entry?;
                    let path = entry.path()?.into_owned();
                    let entry_type = entry.header().entry_type();

                    if entry_type.is_dir() {
                        continue;
                    }

                    let full_path = path.to_str().unwrap().replace("\\", "/");

                    let mut file_contents = Vec::new();
                    entry.read_to_end(&mut file_contents)?;

                    let user_id = key_parts[0];
                    let dataset = key_parts[1];

                    let dst_path = format!("{}/{}/{}", user_id, dataset, path.to_str().unwrap(),);

                    dst_bucket.put(dst_path, file_contents).execute().await?;

                    console_log!("Uploaded file: {}", full_path);
                }
            } else {
                console_error!("Object body not found");
            }
        } else {
            console_error!("Object not found");
        }

        message.ack();
    }

    Ok(())
}
