import { APIGatewayEvent, Context, Handler, Callback } from 'aws-lambda';
import * as Sharp from 'sharp';
import * as AWS from 'aws-sdk';

const s3 = new AWS.S3();

interface IPreset {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const buildRespose = (input: any, message: any, code: number): any => ({
  statusCode: code,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
  },
  body: JSON.stringify({
    message: message,
    input,
  }),
})

export const upload = (bucketName: string, key: string, buffer: Buffer, contentType: string): Promise<any> => {
  return s3.putObject({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
    ContentEncoding: "base64",
    Body: buffer,
  }).promise();
}

export const download = async (bucketName: string, key: string): Promise<any> => {
  return await s3.getObject({ Bucket: bucketName, Key: key }).promise();
}

export const parseBase64Buffer = (body: any): Buffer => {
  return new Buffer(body.replace(/^data:image\/\w+;base64,/, ""), 'base64');
}

export const flatten = (arr: any, depth = 1) =>
  arr.reduce((a: any, v: any) => a.concat(depth > 1 && Array.isArray(v) ? flatten(v, depth - 1) : v), []);

export const crop = async (image: Sharp.Sharp, preset: IPreset): Promise<Buffer> => {
  try{
    const retImage = await image.extract({ ...preset }).toBuffer();
    await Sharp.cache(false);
    return retImage;
  }catch(e){
    throw new Error(e);
  }
}

export const uploadImage: Handler = async (event: any, context: Context, cb: any) => {
  const { x, y, name } = event;

  try {
    const file = await download('alanwake',name);
    await Sharp.cache(false);
    const idata = await Sharp(file.Body).sequentialRead(true).limitInputPixels(0);
    const metadata = await idata.metadata();
    const presets: IPreset[][] = [...Array(x).keys()].map(_x => {
      return [...Array(y).keys()].map(_y => {
        return {
          top: Math.floor(metadata.height as number / x) * _x,
          left: Math.floor(metadata.width as number / y) * _y,
          width: Math.floor(metadata.width as number / y),
          height: Math.floor(metadata.height as number / x)
        }
      })
    });

    const result = await Promise.all(flatten(presets).map(async (p: IPreset) => await crop(idata, p)));
    cb(null, buildRespose(null, "Cropped", 200));

  } catch (e) {
    cb(null, buildRespose(e.message, "Error", 520))
  }
}

