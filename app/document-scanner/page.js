"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { createClient } from "../../lib/supabase";

export default function DocumentScannerPage() {
    const sb = createClient();

    const [user, setUser] = useState(null);

    const [subscriptionPlan, setSubscriptionPlan] =
        useState("none");

    const [subscriptionStatus, setSubscriptionStatus] =
        useState("inactive");

    const [dogs, setDogs] = useState([]);
    const [selectedDog, setSelectedDog] = useState("");

    const [file, setFile] = useState(null);
    const [documentType, setDocumentType] =
        useState("Veterinary document");

    const [preview, setPreview] = useState("");
    const [analysis, setAnalysis] = useState(null);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [saving, setSaving] = useState(false);


    /* =====================================================
       LOAD USER + PLAN + DOGS
    ===================================================== */

    useEffect(() => {
        async function loadAccount() {
            try {
                setLoading(true);
                setError("");

                const {
                    data: { user: currentUser },
                } = await sb.auth.getUser();

                if (!currentUser) {
                    window.location.href = "/login";
                    return;
                }

                setUser(currentUser);


                /* LOAD SUBSCRIPTION */

                const profileResult = await sb
                    .from("profiles")
                    .select(
                        "subscription_plan, subscription_status"
                    )
                    .eq("id", currentUser.id)
                    .single();

                if (
                    !profileResult.error &&
                    profileResult.data
                ) {
                    setSubscriptionPlan(
                        profileResult.data.subscription_plan ||
                        "none"
                    );

                    setSubscriptionStatus(
                        profileResult.data.subscription_status ||
                        "inactive"
                    );
                }


                /* LOAD DOGS */

                const dogsResult = await sb
                    .from("dogs")
                    .select(
                        "id, name, breed"
                    )
                    .order("created_at", {
                        ascending: true,
                    });

                if (dogsResult.error) {
                    throw new Error(
                        dogsResult.error.message
                    );
                }

                const dogData =
                    dogsResult.data || [];

                setDogs(dogData);

                if (dogData.length > 0) {
                    setSelectedDog(
                        dogData[0].id
                    );
                }

            } catch (err) {
                console.error(
                    "Document scanner account error:",
                    err
                );

                setError(
                    err.message ||
                    "Unable to load your account."
                );

            } finally {
                setLoading(false);
            }
        }

        loadAccount();
    }, []);


    /* =====================================================
       PREMIUM ACCESS
    ===================================================== */

    const isPremium =
        subscriptionPlan === "premium" &&
        subscriptionStatus === "active";


    /* =====================================================
       FILE SELECTION
    ===================================================== */

    function handleFileChange(event) {
        const selectedFile =
            event.target.files?.[0];

        setError("");
        setSuccess("");
        setAnalysis(null);
        setPreview("");

        if (!selectedFile) {
            setFile(null);
            return;
        }


        /* IMAGE ONLY */

        if (
            !selectedFile.type.startsWith(
                "image/"
            )
        ) {
            setError(
                "Please upload an image of your veterinary document."
            );

            event.target.value = "";
            setFile(null);

            return;
        }


        /* 10 MB LIMIT */

        if (
            selectedFile.size >
            10 * 1024 * 1024
        ) {
            setError(
                "Please choose an image smaller than 10 MB."
            );

            event.target.value = "";
            setFile(null);

            return;
        }


        setFile(selectedFile);


        /* CREATE IMAGE PREVIEW */

        const reader =
            new FileReader();

        reader.onload = () => {
            setPreview(
                reader.result
            );
        };

        reader.onerror = () => {
            setError(
                "Unable to preview this document."
            );
        };

        reader.readAsDataURL(
            selectedFile
        );
    }


    /* =====================================================
       ANALYZE DOCUMENT
    ===================================================== */

    async function analyzeDocument() {
        setError("");
        setSuccess("");
        setAnalysis(null);

        if (!isPremium) {
            setError(
                "AI Vet Document Scanner is available on Premium."
            );
            return;
        }

        if (!selectedDog) {
            setError(
                "Please select a dog first."
            );
            return;
        }

        if (!file) {
            setError(
                "Please select a veterinary document first."
            );
            return;
        }

        if (!preview) {
            setError(
                "The document is not ready for analysis."
            );
            return;
        }

        setAnalyzing(true);

        try {
            const {
                data: { session },
            } = await sb.auth.getSession();

            if (!session) {
                window.location.href = "/login";
                return;
            }


            const response = await fetch(
                "/api/analyze-document",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        documentUrl:
                            preview,

                        documentType:
                            documentType,

                        fileName:
                            file.name,

                        accessToken:
                            session.access_token,
                    }),
                }
            );


            const data =
                await response.json();


            if (!response.ok) {
                throw new Error(
                    data.error ||
                    "Document analysis failed."
                );
            }


            setAnalysis(
                data.analysis || null
            );

        } catch (err) {
            console.error(
                "Document analysis error:",
                err
            );

            setError(
                err.message ||
                "Unable to analyze the document."
            );

        } finally {
            setAnalyzing(false);
        }
    }


    /* =====================================================
       SAVE DOCUMENT + EXTRACTED INFORMATION
    ===================================================== */

    async function saveToRecords() {
        setError("");
        setSuccess("");

        if (!isPremium) {
            setError(
                "Premium is required to save veterinary documents."
            );
            return;
        }

        if (!user) {
            setError(
                "Please log in again."
            );
            return;
        }

        if (!selectedDog) {
            setError(
                "Please select a dog."
            );
            return;
        }

        if (!file) {
            setError(
                "Please select a veterinary document first."
            );
            return;
        }

        if (!analysis) {
            setError(
                "Please analyze the document before saving."
            );
            return;
        }

        setSaving(true);

        try {
            const selectedDogData =
                dogs.find(
                    (dog) =>
                        dog.id === selectedDog
                );

            const dogName =
                selectedDogData?.name ||
                "your dog";


            /* =================================================
               SAVE TO vet_documents
            ================================================= */

            const documentRecord = {
                dog_id:
                    selectedDog,

                file_name:
                    file.name ||
                    "veterinary-document",

                document_type:
                    documentType ||
                    "Veterinary document",

                visit_date:
                    analysis.visit_date ||
                    null,

                veterinarian_name:
                    analysis.veterinarian_name ||
                    null,

                clinic_name:
                    analysis.clinic_name ||
                    null,

                summary:
                    analysis.summary ||
                    "",

                extracted_test:
                    [
                        analysis.reason
                            ? `Reason: ${analysis.reason}`
                            : "",

                        analysis.medications
                            ? `Medications: ${analysis.medications}`
                            : "",

                        analysis.vaccinations
                            ? `Vaccinations: ${analysis.vaccinations}`
                            : "",

                        analysis.instructions
                            ? `Instructions: ${analysis.instructions}`
                            : "",
                    ]
                        .filter(Boolean)
                        .join("\n\n"),

                storage_path:
                    null,
            };


            const {
                data: savedDocument,
                error: documentError,
            } = await sb
                .from("vet_documents")
                .insert(
                    documentRecord
                )
                .select()
                .single();


            if (documentError) {
                throw new Error(
                    `Unable to save veterinary document: ${documentError.message}`
                );
            }


            /* =================================================
               VACCINATION RECORD
            ================================================= */

            if (
                documentType ===
                "Vaccination record" &&
                analysis.vaccinations
            ) {
                const {
                    error:
                    vaccinationError,
                } = await sb
                    .from("vaccinations")
                    .insert({
                        dog_id:
                            selectedDog,

                        vaccine_name:
                            analysis.vaccinations,

                        vaccination_date:
                            analysis.visit_date ||
                            null,

                        due_date:
                            null,

                        status:
                            "Complete",

                        notes:
                            [
                                `Imported from veterinary document: ${file.name}`,

                                `Clinic: ${analysis.clinic_name ||
                                "Not provided"
                                }`,

                                `Veterinarian: ${analysis.veterinarian_name ||
                                "Not provided"
                                }`,

                                `Summary: ${analysis.summary ||
                                "Not provided"
                                }`,
                            ].join(
                                "\n\n"
                            ),
                    });


                if (vaccinationError) {
                    console.error(
                        "Vaccination save error:",
                        vaccinationError
                    );
                }
            }


            /* =================================================
               MEDICATION RECORD
            ================================================= */

            if (
                documentType ===
                "Medication document" &&
                analysis.medications
            ) {
                const {
                    error:
                    medicationError,
                } = await sb
                    .from("medications")
                    .insert({
                        dog_id:
                            selectedDog,

                        name:
                            analysis.medications,

                        schedule:
                            analysis.instructions ||
                            "See veterinary document.",
                    });


                if (medicationError) {
                    console.error(
                        "Medication save error:",
                        medicationError
                    );
                }
            }


            /* =================================================
               HEALTH RECORD
            ================================================= */

            if (
                documentType ===
                "Laboratory report" ||
                documentType ===
                "Veterinary document" ||
                documentType ===
                "Vet visit report" ||
                documentType ===
                "Other"
            ) {
                const {
                    error:
                    healthError,
                } = await sb
                    .from("health_records")
                    .insert({
                        dog_id:
                            selectedDog,

                        title:
                            analysis.reason ||
                            documentType ||
                            "Veterinary document",

                        record_date:
                            analysis.visit_date ||
                            new Date()
                                .toISOString()
                                .split("T")[0],

                        notes:
                            [
                                analysis.summary
                                    ? `Summary: ${analysis.summary}`
                                    : "",

                                analysis.reason
                                    ? `Reason: ${analysis.reason}`
                                    : "",

                                analysis.medications
                                    ? `Medications: ${analysis.medications}`
                                    : "",

                                analysis.vaccinations
                                    ? `Vaccinations: ${analysis.vaccinations}`
                                    : "",

                                analysis.instructions
                                    ? `Instructions: ${analysis.instructions}`
                                    : "",

                                analysis.clinic_name
                                    ? `Clinic: ${analysis.clinic_name}`
                                    : "",

                                analysis.veterinarian_name
                                    ? `Veterinarian: ${analysis.veterinarian_name}`
                                    : "",
                            ]
                                .filter(Boolean)
                                .join(
                                    "\n\n"
                                ),
                    });


                if (healthError) {
                    console.error(
                        "Health record save error:",
                        healthError
                    );
                }
            }


            /* =================================================
               SUCCESS
            ================================================= */

            setSuccess(
                `✅ Veterinary document saved successfully for ${dogName}.`
            );

            console.log(
                "Saved veterinary document:",
                savedDocument
            );

        } catch (err) {
            console.error(
                "Document save error:",
                err
            );

            setError(
                err.message ||
                "Unable to save veterinary document."
            );

        } finally {
            setSaving(false);
        }
    }


    /* =====================================================
       RESET
    ===================================================== */

    function resetScanner() {
        setFile(null);
        setPreview("");
        setAnalysis(null);
        setError("");
        setSuccess("");
    }


    /* =====================================================
       SELECTED DOG
    ===================================================== */

    const selectedDogData =
        dogs.find(
            (dog) =>
                dog.id === selectedDog
        );


    /* =====================================================
       PAGE
    ===================================================== */

    return (
        <>
            <Sidebar />

            <main className="container">

                {/* HEADER */}

                <section className="hero">

                    <span className="pill">
                        📄 Premium Feature
                    </span>

                    <h1>
                        AI Vet Document Scanner
                    </h1>

                    <p>
                        Upload a veterinary document
                        and let AI organize important
                        information for your dog's records.
                    </p>

                </section>


                {/* PREMIUM LOCK */}

                {!loading && !isPremium && (
                    <section
                        className="card"
                        style={{
                            marginBottom: 20,
                            textAlign: "center",
                            background:
                                "linear-gradient(135deg,#fff8e8,#fffdf7)",
                            border:
                                "2px solid #f5c451",
                        }}
                    >

                        <h2>
                            🔒 Premium Feature
                        </h2>

                        <p className="muted">
                            AI Vet Document Scanner is
                            available only with Premium.
                        </p>

                        <button
                            className="btn primary"
                            type="button"
                            onClick={() =>
                                window.location.href =
                                "/dashboard"
                            }
                        >
                            ⭐ View Premium →
                        </button>

                    </section>
                )}


                {/* SCANNER */}

                {isPremium && (
                    <section className="card">

                        <h2>
                            📄 Upload Veterinary Document
                        </h2>

                        <p className="muted">
                            Select your dog, choose the
                            document type, then upload a
                            clear image.
                        </p>


                        {/* DOG */}

                        <div
                            style={{
                                marginTop: 22,
                            }}
                        >

                            <label
                                style={{
                                    display: "block",
                                    fontWeight: "700",
                                    marginBottom: 8,
                                }}
                            >
                                🐶 Select your dog
                            </label>

                            {loading ? (

                                <p className="muted">
                                    Loading your dogs...
                                </p>

                            ) : dogs.length === 0 ? (

                                <div
                                    style={{
                                        padding: 18,
                                        borderRadius: 14,
                                        background:
                                            "#f7f9fc",
                                    }}
                                >

                                    <p>
                                        You don't have
                                        any dogs yet.
                                    </p>

                                    <button
                                        className="btn"
                                        type="button"
                                        onClick={() =>
                                            window.location.href =
                                            "/dashboard"
                                        }
                                    >
                                        Add Your Dog →
                                    </button>

                                </div>

                            ) : (

                                <select
                                    className="input"
                                    value={selectedDog}
                                    onChange={(e) => {
                                        setSelectedDog(
                                            e.target.value
                                        );
                                        setAnalysis(null);
                                        setError("");
                                        setSuccess("");
                                    }}
                                    disabled={
                                        analyzing ||
                                        saving
                                    }
                                >

                                    {dogs.map(
                                        (dog) => (
                                            <option
                                                key={
                                                    dog.id
                                                }
                                                value={
                                                    dog.id
                                                }
                                            >
                                                🐶{" "}
                                                {
                                                    dog.name
                                                }

                                                {dog.breed
                                                    ? ` — ${dog.breed}`
                                                    : ""}
                                            </option>
                                        )
                                    )}

                                </select>
                            )}

                        </div>


                        {/* DOCUMENT TYPE */}

                        {dogs.length > 0 && (
                            <div
                                style={{
                                    marginTop: 20,
                                }}
                            >

                                <label
                                    style={{
                                        display: "block",
                                        fontWeight: "700",
                                        marginBottom: 8,
                                    }}
                                >
                                    📋 Document type
                                </label>

                                <select
                                    className="input"
                                    value={
                                        documentType
                                    }
                                    onChange={(e) => {
                                        setDocumentType(
                                            e.target.value
                                        );
                                        setAnalysis(null);
                                        setError("");
                                        setSuccess("");
                                    }}
                                    disabled={
                                        analyzing ||
                                        saving
                                    }
                                >

                                    <option>
                                        Veterinary document
                                    </option>

                                    <option>
                                        Vet visit report
                                    </option>

                                    <option>
                                        Vaccination record
                                    </option>

                                    <option>
                                        Medication document
                                    </option>

                                    <option>
                                        Laboratory report
                                    </option>

                                    <option>
                                        Other
                                    </option>

                                </select>

                            </div>
                        )}


                        {/* FILE */}

                        {dogs.length > 0 && (
                            <div
                                style={{
                                    marginTop: 20,
                                }}
                            >

                                <label
                                    style={{
                                        display: "block",
                                        fontWeight: "700",
                                        marginBottom: 8,
                                    }}
                                >
                                    📷 Choose document
                                </label>

                                <input
                                    className="input"
                                    type="file"
                                    accept="image/*"
                                    onChange={
                                        handleFileChange
                                    }
                                    disabled={
                                        analyzing ||
                                        saving
                                    }
                                />

                                <p
                                    className="muted"
                                    style={{
                                        fontSize: 13,
                                        marginTop: 8,
                                    }}
                                >
                                    JPG, PNG or other
                                    image format.
                                    Maximum 10 MB.
                                </p>

                            </div>
                        )}


                        {/* PREVIEW */}

                        {preview && (
                            <div
                                style={{
                                    marginTop: 22,
                                    textAlign: "center",
                                }}
                            >

                                <h3>
                                    👀 Document Preview
                                </h3>

                                <img
                                    src={preview}
                                    alt="Veterinary document preview"
                                    style={{
                                        maxWidth:
                                            "100%",
                                        maxHeight:
                                            "500px",
                                        borderRadius:
                                            "16px",
                                        border:
                                            "1px solid #e5e7eb",
                                        objectFit:
                                            "contain",
                                    }}
                                />

                            </div>
                        )}


                        {/* BUTTONS */}

                        {file && (
                            <div
                                style={{
                                    display: "flex",
                                    flexWrap:
                                        "wrap",
                                    gap: 12,
                                    marginTop: 22,
                                }}
                            >

                                <button
                                    className="btn primary"
                                    type="button"
                                    onClick={
                                        analyzeDocument
                                    }
                                    disabled={
                                        analyzing ||
                                        saving
                                    }
                                >
                                    {analyzing
                                        ? "🤖 Analyzing..."
                                        : "🤖 Analyze Document"}
                                </button>


                                {analysis && (
                                    <button
                                        className="btn primary"
                                        type="button"
                                        onClick={
                                            saveToRecords
                                        }
                                        disabled={
                                            saving ||
                                            analyzing
                                        }
                                    >
                                        {saving
                                            ? "💾 Saving..."
                                            : "💾 Save to Records"}
                                    </button>
                                )}


                                <button
                                    className="btn"
                                    type="button"
                                    onClick={
                                        resetScanner
                                    }
                                    disabled={
                                        analyzing ||
                                        saving
                                    }
                                >
                                    🔄 Start Again
                                </button>

                            </div>
                        )}

                    </section>
                )}


                {/* ERROR */}

                {error && (
                    <section
                        className="card"
                        style={{
                            marginTop: 20,
                            border:
                                "1px solid #f0b4b4",
                        }}
                    >

                        <h3>
                            ⚠️ Something went wrong
                        </h3>

                        <p>
                            {error}
                        </p>

                    </section>
                )}


                {/* SUCCESS */}

                {success && (
                    <section
                        className="card"
                        style={{
                            marginTop: 20,
                            background:
                                "#f0fff4",
                            border:
                                "1px solid #9ae6b4",
                        }}
                    >

                        <h3>
                            ✅ Saved Successfully
                        </h3>

                        <p>
                            {success}
                        </p>

                    </section>
                )}


                {/* AI ANALYSIS */}

                {analysis && (
                    <section
                        className="card"
                        style={{
                            marginTop: 20,
                        }}
                    >

                        <h2>
                            🤖 AI Document Analysis
                        </h2>

                        {selectedDogData && (
                            <p className="muted">
                                Analysis for{" "}
                                <strong>
                                    {
                                        selectedDogData.name
                                    }
                                </strong>
                            </p>
                        )}


                        <div
                            style={{
                                display: "grid",
                                gap: 12,
                                marginTop: 18,
                            }}
                        >

                            <div>
                                <strong>
                                    🧑‍⚕️ Veterinarian
                                </strong>

                                <p className="muted">
                                    {
                                        analysis.veterinarian_name ||
                                        "Not provided"
                                    }
                                </p>
                            </div>


                            <div>
                                <strong>
                                    🏥 Clinic
                                </strong>

                                <p className="muted">
                                    {
                                        analysis.clinic_name ||
                                        "Not provided"
                                    }
                                </p>
                            </div>


                            <div>
                                <strong>
                                    📅 Visit Date
                                </strong>

                                <p className="muted">
                                    {
                                        analysis.visit_date ||
                                        "Not provided"
                                    }
                                </p>
                            </div>


                            <div>
                                <strong>
                                    📋 Reason
                                </strong>

                                <p className="muted">
                                    {
                                        analysis.reason ||
                                        "Not provided"
                                    }
                                </p>
                            </div>


                            <div>
                                <strong>
                                    💊 Medications
                                </strong>

                                <p className="muted">
                                    {
                                        analysis.medications ||
                                        "Not provided"
                                    }
                                </p>
                            </div>


                            <div>
                                <strong>
                                    💉 Vaccinations
                                </strong>

                                <p className="muted">
                                    {
                                        analysis.vaccinations ||
                                        "Not provided"
                                    }
                                </p>
                            </div>


                            <div>
                                <strong>
                                    📝 Summary
                                </strong>

                                <p
                                    className="muted"
                                    style={{
                                        whiteSpace:
                                            "pre-wrap",
                                    }}
                                >
                                    {
                                        analysis.summary ||
                                        "Not provided"
                                    }
                                </p>
                            </div>


                            <div>
                                <strong>
                                    📌 Instructions
                                </strong>

                                <p
                                    className="muted"
                                    style={{
                                        whiteSpace:
                                            "pre-wrap",
                                    }}
                                >
                                    {
                                        analysis.instructions ||
                                        "Not provided"
                                    }
                                </p>
                            </div>

                        </div>

                    </section>
                )}


                {/* INFORMATION */}

                <section
                    className="card"
                    style={{
                        marginTop: 20,
                    }}
                >

                    <h3>
                        🔒 Premium Document Scanner
                    </h3>

                    <p className="muted">
                        Your veterinary documents can
                        be organized for each dog in
                        your My First Dog account.
                    </p>

                    <p className="muted">
                        ⚠️ AI extraction is for
                        organizing information only
                        and does not replace professional
                        veterinary advice.
                    </p>

                </section>

            </main>
        </>
    );
}