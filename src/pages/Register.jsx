import rentLogo from "../assets/rent.png";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "../components/ui/button";
import React, { useState, useRef } from "react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSeparator,
    InputOTPSlot,
} from "@/components/ui/input-otp"
import { supabase } from '../../supabaseClient';

function Register() {
    const [step, setStep] = useState(1); // 1 = basic info, 2 = OTP, 3 = Face++
    const [date, setDate] = useState(new Date());
    const [location, setLocation] = useState({ lat: null, lng: null });
    const [locationError, setLocationError] = useState(null);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);
    const [result, setResult] = useState(null);

    const startCamera = async () => {
        try {
            const s = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user" }, // front camera
                audio: false
            });
            setStream(s);
            if (videoRef.current) {
                videoRef.current.srcObject = s;
            }
        } catch (err) {
            console.error("Camera error:", err);
            alert("Camera error: " + err.message);
        }
    };

    const captureImage = () => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0);

        canvas.toBlob(async (blob) => {
            setCapturedImage(blob);

            // Immediately run face comparison
            const formDataData = new FormData();
            formDataData.append("api_key", "W9-sl3ggHVQ2DsAuGh8abK4GJe-6LWY7");
            formDataData.append("api_secret", "IKs0rowIo3yVqLB8FS3kpOkpFhJ3qTt3");
            formDataData.append("image_file1", formData.idImage); // uploaded ID
            formDataData.append("image_file2", blob);            // captured selfie

            try {
                const res = await fetch("https://api-us.faceplusplus.com/facepp/v3/compare", {
                    method: "POST",
                    body: formDataData,
                });
                const data = await res.json();
                console.log("Face++ result:", data);

                if (data.confidence > 80) {
                    setResult("✅ Face matched with ID");
                } else {
                    setResult("❌ Face does not match");
                }
            } catch (err) {
                console.error("Face++ API error:", err);
                setResult("⚠️ Error comparing faces");
            }
        }, "image/jpeg");
    };

    // Compare with Face++
    const compareFaces = async () => {
        const formDataData = new FormData();
        formDataData.append("api_key", "W9-sl3ggHVQ2DsAuGh8abK4GJe-6LWY7");
        formDataData.append("api_secret", "IKs0rowIo3yVqLB8FS3kpOkpFhJ3qTt3");
        formDataData.append("image_file1", formData.idImage);   // ID from Step 1
        formDataData.append("image_file2", capturedImage);      // Selfie

        const res = await fetch("https://api-us.faceplusplus.com/facepp/v3/compare", {
            method: "POST",
            body: formDataData,
        });

        const data = await res.json();
        console.log("Face++ result:", data);

        if (data.confidence > 80) {
            setResult("✅ Face matched with ID");
        } else {
            setResult("❌ Face does not match");
        }
    };

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
        phone: "",
        dob: null,
        idImage: null,
        otp: "",
        faceImage: null,
    });

    const [errors, setErrors] = useState({});

    const handleImageUpload = (e, type) => {
        const file = e.target.files[0];
        if (file) {
            setFormData((prev) => ({ ...prev, [type]: file }));
            setErrors((prev) => ({ ...prev, [type]: null }));
        }
    };

    const getUserLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    });
                    setLocationError(null);
                },
                (error) => {
                    setLocationError(error.message);
                }
            );
        } else {
            setLocationError("Geolocation is not supported by your browser");
        }
    };

    const handleNext = async () => {
        if (step === 1) {
            if (!formData.email) {
                alert("Please enter your email first.");
                return;
            }
            // Send OTP to email
            const { error } = await supabase.auth.signInWithOtp({
                email: formData.email,
                options: {
                    shouldCreateUser: true,
                    // DO NOT include emailRedirectTo → that’s only for magic link
                },
            });

            if (error) {
                console.error(error.message);
                alert("Failed to send OTP: " + error.message);
                return;
            }
            console.log("OTP sent to", formData.email);
            setStep(2);
        }

        else if (step === 2) {
            if (!formData.otp) {
                alert("Please enter the OTP.");
                return;
            }

            // const { data: { session }, error } = await supabase.auth.verifyOtp({
            //     email: formData.email,   // email entered at step 1
            //     token: formData.otp,     // OTP from InputOTP
            //     type: "email",
            // });

            // if (error) {
            //     console.error(error.message);
            //     alert("Invalid OTP: " + error.message);
            //     return;
            // }

            console.log("OTP input collected, moving to Step 3");
            setStep(3);
        }

        else if (step === 3) {
            // Step 3: Face++ verification first
            if (!capturedImage) {
                alert("Please capture your selfie first.");
                return;
            }

            // Compare faces
            await compareFaces();

            if (!result?.includes("✅")) {
                alert("Face verification failed!");
                return;
            }

            try {
                // ✅ Face matched, now verify OTP in Supabase Auth
                const { data: { session }, error: otpError } = await supabase.auth.verifyOtp({
                    email: formData.email,
                    token: formData.otp,
                    type: "email",
                });

                if (otpError) {
                    console.error(otpError.message);
                    alert("OTP verification failed: " + otpError.message);
                    return;
                }

                console.log("OTP verified & user logged in!", session);

                // Upload ID image
                let idImageUrl = null;
                if (formData.idImage) {
                    const { data, error } = await supabase.storage
                        .from("user-ids")
                        .upload(`ids/${Date.now()}_${formData.idImage.name}`, formData.idImage);

                    if (error) throw error;

                    const { data: publicUrl } = supabase.storage
                        .from("user-ids")
                        .getPublicUrl(data.path);
                    idImageUrl = publicUrl.publicUrl;
                }

                // Upload selfie
                let faceImageUrl = null;
                if (capturedImage) {
                    const file = new File([capturedImage], `selfie_${Date.now()}.jpg`, { type: "image/jpeg" });
                    const { data, error } = await supabase.storage
                        .from("user-faces")
                        .upload(`faces/${file.name}`, file);

                    if (error) throw error;

                    const { data: publicUrl } = supabase.storage
                        .from("user-faces")
                        .getPublicUrl(data.path);
                    faceImageUrl = publicUrl.publicUrl;
                }

                // Insert user into your table
                const { error: insertError } = await supabase.from("users").insert([
                    {
                        first_name: formData.firstName,
                        last_name: formData.lastName,
                        password: formData.password,
                        email: formData.email,
                        phone: formData.phone,
                        dob: formData.dob ? formData.dob.toISOString() : null,
                        location_lat: location.lat,
                        location_lng: location.lng,
                        id_image_url: idImageUrl,
                        face_image_url: faceImageUrl,
                        face_verified: true,
                    },
                ]);

                if (insertError) throw insertError;

                alert("🎉 Registration successful!");
                console.log("User saved to Supabase");

            } catch (err) {
                console.error("Error during registration:", err);
                alert("Failed to register: " + err.message);
            }
        }
    };

    const handleBack = () => {
        // Prevent going back from Step 2 to avoid resending OTP
        if (step > 2) {
            setStep(step - 1);
        }
    };

    return (
        <div className="flex justify-center min-h-screen bg-gray-100 p-4">
            <div className="w-full max-w-md md:max-w-lg lg:max-w-xl bg-white shadow-lg rounded-2xl flex flex-col items-center p-6">
                <img src={rentLogo} alt="Logo" className="w-20 h-20 object-contain" />
                <p className="text-gray-600 mt-5">Join our community</p>
                <h2 className="text-xl font-bold mt-4">Create your account</h2>

                {/* Step 1: Basic Info */}
                {step === 1 && (
                    <>
                        {/* Name */}
                        <form className="w-full mt-4">
                            <div className="flex flex-col md:flex-row gap-2">
                                <input
                                    className="flex-1 shadow appearance-none border rounded-lg py-3 px-3 text-gray-700 placeholder-gray-400 focus:outline-none focus:shadow-outline"
                                    placeholder="First Name"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                />
                                <input
                                    className="flex-1 shadow appearance-none border rounded-lg py-3 px-3 text-gray-700 placeholder-gray-400 focus:outline-none focus:shadow-outline"
                                    placeholder="Last Name"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                />
                            </div>
                        </form>

                        {/* Date */}
                        <div className="flex flex-col w-full m-4">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full text-left">
                                        {date ? date.toLocaleDateString() : "Select a date"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={(d) => {
                                            setDate(d);
                                            setFormData({ ...formData, dob: d });
                                        }}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Phone */}
                        <PhoneInput
                            country="ph"
                            value={formData.phone}
                            onChange={(value) => setFormData({ ...formData, phone: value })}
                            containerClass="w-full"
                            inputClass="!w-full !pl-14 !py-3 !px-3 !rounded-lg !shadow !outline-none"
                        />

                        {/* Email */}
                        <form className="w-full mt-4">
                            <input
                                className="flex-1 shadow appearance-none border rounded-lg py-3 px-3 text-gray-700 placeholder-gray-400 focus:outline-none focus:shadow-outline w-full"
                                type="email"
                                placeholder="Email Address"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </form>

                        {/* Location */}
                        <div className="mt-4 w-full flex flex-col gap-2">
                            <button
                                type="button"
                                onClick={getUserLocation}
                                className="w-full py-3 px-4 rounded-lg border shadow hover:bg-gray-50 text-gray-700"
                            >
                                {location.lat
                                    ? `Lat: ${location.lat.toFixed(4)}, Lng: ${location.lng.toFixed(4)}`
                                    : "Get My Location"}
                            </button>
                            {locationError && <p className="text-red-500 text-sm">{locationError}</p>}
                        </div>

                        {/* Password */}
                        <form className="w-full mt-4">
                            <input
                                className="flex-1 shadow appearance-none border rounded-lg py-3 px-3 text-gray-700 placeholder-gray-400 focus:outline-none focus:shadow-outline w-full"
                                type="password"
                                placeholder="Password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </form>

                        <form className="w-full mt-4">
                            <input
                                className="flex-1 shadow appearance-none border rounded-lg py-3 px-3 text-gray-700 placeholder-gray-400 focus:outline-none focus:shadow-outline w-full"
                                type="password"
                                placeholder="Confirm Password"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            />
                        </form>

                        {/* Upload ID (Step 1) */}
                        <div className="w-full mt-4">
                            <div className="input-group">
                                <div className="upload-section">
                                    <label className="upload-label w-full cursor-pointer">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleImageUpload(e, "idImage")}
                                            className="hidden"
                                        />
                                        <div className="upload-area w-full border border-dashed rounded-lg p-4 flex flex-col items-center justify-center">
                                            {formData.idImage ? (
                                                <div className="upload-preview text-center">
                                                    <span className="upload-icon text-green-500 text-2xl">✅</span>
                                                    <span className="upload-text">{formData.idImage.name}</span>
                                                </div>
                                            ) : (
                                                <div className="upload-placeholder text-center flex flex-col">
                                                    <span className="upload-icon text-gray-400 text-2xl">📄</span>
                                                    <span className="upload-text font-medium">Upload ID Image</span>
                                                    <span className="upload-subtext text-sm text-gray-500">
                                                        Drag & drop or click to browse
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </label>
                                </div>
                                {errors.idImage && <span className="error-text text-red-500 text-sm">{errors.idImage}</span>}
                            </div>
                        </div>
                    </>
                )}

                {/* Step 2: OTP */}
                {step === 2 && (
                    <div className="w-full mt-4">
                        <p className="text-gray-600 mb-2">
                            Enter the OTP sent to <span className="font-bold">{formData.email}</span>:
                        </p>

                        {/* OTP Input */}
                        <div className="flex justify-center">
                            <InputOTP
                                maxLength={6}
                                className="flex gap-3"
                                value={formData.otp}
                                onChange={(value) =>
                                    setFormData((prev) => ({ ...prev, otp: value }))
                                }
                            >
                                <InputOTPGroup>
                                    <InputOTPSlot index={0} className="w-14 h-14 text-xl" />
                                    <InputOTPSlot index={1} className="w-14 h-14 text-xl" />
                                    <InputOTPSlot index={2} className="w-14 h-14 text-xl" />
                                </InputOTPGroup>
                                <InputOTPSeparator />
                                <InputOTPGroup>
                                    <InputOTPSlot index={3} className="w-14 h-14 text-xl" />
                                    <InputOTPSlot index={4} className="w-14 h-14 text-xl" />
                                    <InputOTPSlot index={5} className="w-14 h-14 text-xl" />
                                </InputOTPGroup>
                            </InputOTP>
                        </div>

                        {/* Change email link */}
                        <p className="text-sm text-gray-500 mt-3 text-center">
                            Wrong email?{" "}
                            <button
                                onClick={() => {
                                    setFormData((prev) => ({ ...prev, email: "", otp: "" }));
                                    setStep(1);
                                }}
                                className="text-blue-600 underline hover:text-blue-800"
                            >
                                Change Email
                            </button>
                        </p>
                    </div>
                )}

                {/* Step 3: Face++ */}
                {step === 3 && (
                    <div className="w-full mt-4 flex flex-col items-center">
                        <p className="text-gray-600 mb-2">Face Verification</p>

                        {/* Video for camera */}
                        <video ref={videoRef} autoPlay playsInline className="w-full max-w-md rounded-lg" />
                        <canvas ref={canvasRef} style={{ display: "none" }} />

                        {/* Buttons */}
                        {!stream && (
                            <button
                                onClick={startCamera}
                                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
                            >
                                Start Camera
                            </button>
                        )}

                        {stream && !capturedImage && (
                            <button
                                onClick={captureImage}
                                className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg"
                            >
                                Capture Selfie
                            </button>
                        )}

                        {capturedImage && (
                            <button
                                onClick={compareFaces}
                                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg"
                            >
                                Compare with ID
                            </button>
                        )}

                        {result && <p className="mt-4 font-bold">{result}</p>}
                    </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-4 w-full">
                    <Button
                        variant="default"
                        onClick={handleNext}
                        className="h-12 bg-[#1E1E1E] text-white hover:bg-[#ffab00] hover:text-white cursor-pointer px-6"
                    >
                        {step === 3 ? "Register" : "Next"}
                    </Button>
                </div>
                <div className="text-center mt-4 flex flex-row items-center gap-2 justify-center">
                    <p className="text-gray-600 mb-0">Don't have an account?</p>
                    <a className="font-bold text-sm text-[#F09B35] hover:text-[#DB7C0B]" href="/">
                        Login
                    </a>
                </div>
            </div>
        </div>
    );
}

export default Register;
