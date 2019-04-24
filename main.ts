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

export const download = (bucketName: string, key: string): Promise<any> => {
  return s3.getObject({ Bucket: bucketName, Key: key }).promise();
}

export const parseBase64Buffer = (body: any): Buffer => {
  return new Buffer(body.replace(/^data:image\/\w+;base64,/, ""), 'base64');
}

export const crop = (image: Sharp.Sharp, preset: IPreset): Promise<Buffer> => {
 return image.extract({ ...preset }).toFormat('png').toBuffer();
}

export const uploadImage : Handler = async (event : any, context : Context, cb : any) => {

  const { name , type , body , BucketName , contentType } = event;
  const buf = new Buffer(body.replace(/^data:image\/\w+;base64,/, ""),'base64')

  try{

    upload(BucketName, `${name}.${type}`, buf, contentType);
    const file = await download(BucketName,  `${name}.${type}`);
    const idata = Sharp(file.Body);
    const metadata = await idata.metadata();
    const n = 100;
    const preset: IPreset[] = [ ...Array(n).keys() ].map( x => {
      return {
        top   : Math.floor( metadata.height as number / n ) * x,
        left  : Math.floor( metadata.width as number  / n ) * x,
        width : Math.floor( metadata.height as number / n ),
        height: Math.floor( metadata.width as number  / n ) 
      }
    })
    const cropBufferArray = await Promise.all( await preset.map( prop => { return crop(idata, prop) }));
    cropBufferArray.map(( cropBuffer, index) => {
      upload(BucketName, `${name}-${Date()}-${index}.${type}`, cropBuffer, contentType);
    })

    cb(null, buildRespose(undefined, "Uploaded", 200));

  }catch(e){
    cb(null, buildRespose(e.message, "Error", 520))
  }
}