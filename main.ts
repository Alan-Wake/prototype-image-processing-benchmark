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

export const crop = async (buckerName: string, key: string, contentType: string, image: Sharp.Sharp, preset: IPreset): Promise<any> => {
  const croppedImage = await image.extract({ ...preset }).toFormat('png').toBuffer();
  return upload(buckerName, key, croppedImage, contentType);
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
    const preset: IPreset[][] = [ ...Array(n).keys() ].map( x => {
      return [ ...Array(n).keys() ].map( y => {
        return  {
          top   : Math.floor( metadata.height as number / n ) * x,
          left  : Math.floor( metadata.width  as number / n ) * y,
          width : Math.floor( metadata.width  as number / n ),
          height: Math.floor( metadata.height as number / n ) 
        }
      })
    });
    await Promise.all( await preset.map(( props, x )  => { return Promise.all ( props.map(( prop , y )=> { return crop( BucketName, `${name}-${Date()}-${x}-${y}.${type}`, contentType, idata, prop )}))}));

    cb(null, buildRespose(undefined, "Uploaded", 200));

  }catch(e){

    cb(null, buildRespose(e.message, "Error", 520));
  
  }
}