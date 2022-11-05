import { createClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";
import { decode } from "base64-arraybuffer";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};
export default async function handler(req, res) {
  // Upload image to Supabase
  if (req.method === "POST") {
    let { image } = req.body;
    if (!image) {
      return req.status(500).json({ message: "No image provided" });
    }
    try {
      // check if image is 64 bit encoded
      const contentType = image.match(/data:(.*);base64/)?.[1];
      const base64FileData = image.split("base64,")?.[1];
      if (!contentType || !base64FileData) {
        return res.status(500).json({ message: "Image data not valid" });
      }
      const fileName = nanoid();
      const ext = contentType.split("/")[1];
      const path = `${fileName}.${ext}`;

      const { data, error: UploadError } = await supabase.storage
        .from(process.env.SUPABASE_BUCKET)
        .upload(path, decode(base64FileData), {
          contentType,
          upsert: true,
        });
      if (UploadError) {
        throw new Error("Unable to upload image to storage");
      }

      const url = `${process.env.SUPABASE_URL}/storage/v1/object/public/${process.env.SUPABASE_BUCKET}/${data.path}`;
      return res.status(200).json({ url });
    } catch (error) {
      res.status(500).json({ message: "Something went wrong" });
    }
  }
  // HTTP method not supported!
  else {
    res.setHeader("Allow", ["POST"]);
    res
      .status(405)
      .json({ message: `HTTP method ${req.method} is not supported.` });
  }
}
