import { prismaDB } from "@/lib/prismaDB";
import { OTPHandler } from "@/lib/sendEmail";
import { NextResponse } from "next/server";

export async function POST(request : Request) {
    const body = await request.json();
    const {email} = body;
    
    if (!email) {
        return NextResponse.json( {
                message:"Missing value email",
                status : 422
            }
        )
    }

    const nonVerifiedUser = await prismaDB.nonVerifiedUser.findUnique({
        where : {
            email
        }
    })
    if (!nonVerifiedUser) {
        return NextResponse.json( {
                message:"Uesr does not exist",
                status : 400
            }
        )
    }

    const timeDifference = (nonVerifiedUser.otpExpiry.getTime() - new Date().getTime()) / 1000
    if (timeDifference > 0) {
        return NextResponse.json({
            message:`OTP already sent, please check your email or wait until ${Math.ceil(timeDifference)} seconds before resending OTP`,
            status : 401
        })
    }

    try {
        const otpClient = new OTPHandler(email)
        const otp = otpClient.getOTP()
        const otpExpiry = new Date(Date.now() + 60 * 1000)
    
        await prismaDB.nonVerifiedUser.update({
            where : {
                id: nonVerifiedUser.id
            },
            data : {
                otp,
                otpExpiry
            }
        })

        otpClient.sendOTP()
        return NextResponse.json("OTP sent, check your email", {
            status : 200
        })
    } catch (err) {
        console.log(err)
        return NextResponse.json( {
            message:"Something went wrong",
            status : 500
        })
    }
}