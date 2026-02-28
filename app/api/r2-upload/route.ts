import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export async function POST(request: NextRequest) {
  try {
    const { fileName, contentType } = await request.json()

    if (!fileName || !contentType) {
      return NextResponse.json({ error: 'fileName과 contentType이 필요합니다.' }, { status: 400 })
    }

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: fileName,
      ContentType: contentType,
    })

    // 1시간 유효한 presigned URL 생성
    const presignedUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 })

    // 공개 접근 URL
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`

    return NextResponse.json({ presignedUrl, publicUrl })
  } catch (error: any) {
    console.error('R2 presigned URL 생성 실패:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
