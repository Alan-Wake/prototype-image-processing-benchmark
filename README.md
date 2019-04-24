# prototype-image-processing-benchmark

## Todo

1. 잘못된 로직 ( 가운데만 crop )
    - 전체가 아닌 특정 부분만 크롭하므로 전체 용량 대비에 대한 밴치마크가 옳게 나오지 않음.
    - 우선순위 높음
    ```javascript
    const preset: IPreset[] = [ ...Array(n).keys() ].map( x => {
    })
    ```

2. 이미지 분할 최적화
    - Sharp에서 소수가 가능한 API 부터 확인( 초기에 소수를 넣었으나 자연수만 받아들여 내림처리 해놓은 상태 )
    - 소수를 받아들이는 API가 없을시 최적화 로직 구현

    ```javascript
    return {
        top   : Math.floor( metadata.height as number / n ) * x,
        left  : Math.floor( metadata.width as number  / n ) * x,
        width : Math.floor( metadata.height as number / n ),
        height: Math.floor( metadata.width as number  / n ) 
    }
    ```

3. Update Frontend dataform 
    - frontend request data 형식으로 인한 오류 발생
    - const { name , type , body , BucketName , contentType } = JSON.parse(event.body);

## Progress

1. Image Upload with Lambda
2. Image Save
3. Image Extract
4. Image Save
5. 람다는 어느정도 ?
    1. 이미지 사이즈 1000 * 1000 미만 png  
        * Duration: 5547.17 ms	Billed Duration: 5600 ms 	Memory Size: 1024 MB	Max Memory Used: 190 MB

