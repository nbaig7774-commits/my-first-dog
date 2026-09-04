"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import { createClient } from "../../lib/supabase";
import { hasPremiumAccess } from "../../lib/planAccess";

export default function DocumentsPage() {
    const sb = createClient();
    const router = useRouter();

    const [dogs, setDogs] = useState([]);
    const [documents, setDocuments] = useState([]);

    const [dogId, setDogId] = useState("");
    const [file, setFile] = useState(null);

    const [subscriptionPlan, setSubscriptionPlan] =
        useState("none");

    const [subscriptionStatus, setSubscriptionStatus] =
        useState("inactive");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [analyzingId, setAnalyzingId] = useState(null);

    const [msg, setMsg] = useState("");

    // --------------------------------
    // LOAD PAGE DATA
    // --------------------------------

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        setMsg("");

        const {
            data: { user },
        } = await sb.auth.getUser();

        if (!user) {
            router.push("/login");
            return;
        }

        // -----------------------------
        // SUBSCRIPTION
        // -----------------------------

        const { data: profile } = await sb
            .from("profiles")
            .select(
                "subscription_plan, subscription_status"
            )
            .eq("id", user.id)
            .single();

        if (profile) {
            setSubscriptionPlan(
                profile.subscription_plan || "none"
            );

            setSubscriptionStatus(
                profile.subscription_status || "inactive"
            );
        }

        // -----------------------------
        // DOGS
        // -----------------------------

        const {
            data: dogData,
            error: dogError,
        } = await sb
            .from("dogs")
            .select("id, name, breed")
            .order("created_at", {
                ascending: true,
            });

        if (dogError) {
            setMsg(dogError.message);
            setLoading(false);
            return;
        }

        const allDogs = dogData || [];

        setDogs(allDogs);

        if (allDogs.length > 0) {
            setDogId(
                (current) =>
                    current || allDogs[0].id
            );
        }

        // -----------------------------
        // DOCUMENTS
        // -----------------------------

        const {
            data: documentData,
            error: documentError,
        } = await sb
            .from("vet_documents")
            .select("*")
            .order("created_at", {
                ascending: false,
            });

        if (documentError) {
            setMsg(documentError.message);
        } else {
            setDocuments(documentData || []);
        }

        setLoading(false);
    }

    // --------------------------------
    // PREMIUM ACCESS
    // --------------------------------

    const isPremium =
        subscriptionStatus === "active" &&
        hasPremiumAccess(subscriptionPlan);

    // --------------------------------
    // DOG NAME
    // --------------------------------

    function getDogName(id) {
        const dog = dogs.find(
            (item) => item.id === id
        );

        return dog
            ? dog.name
            : "Unknown dog";
    }

    // --------------------------------
    // FILE SELECT
    // --------------------------------

    function handleFileChange(event) {
        const selectedFile =
            event.target.files?.[0] || null;

        setMsg("");

        if (!selectedFile) {
            setFile(null);
            return;
        }

        const allowedTypes = [
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/webp",
        ];

        if (
            !allowedTypes.includes(
                selectedFile.type
            )
        ) {
            setFile(null);
            event.target.value = "";

            setMsg(
                "Please select a PDF, JPG, PNG, or WEBP file."
            );

            return;
        }

        const maxSize =
            10 * 1024 * 1024;

        if (selectedFile.size > maxSize) {
            setFile(null);
            event.target.value = "";

            setMsg(
                "File must be 10 MB or smaller."
            );

            return;
        }

        setFile(selectedFile);

        setMsg(
            `File selected: ${selectedFile.name}`
        );
    }

    // --------------------------------
    // UPLOAD DOCUMENT
    // --------------------------------

    async function saveDocument(event) {
        event.preventDefault();

        if (!isPremium) {
            setMsg(
                "AI Vet Document Scanner is available with Premium."
            );
            return;
        }

        if (!dogId) {
            setMsg("Please select a dog.");
            return;
        }

        if (!file) {
            setMsg(
                "Please select a veterinary document."
            );
            return;
        }

        setSaving(true);
        setMsg("");

        const {
            data: { user },
        } = await sb.auth.getUser();

        if (!user) {
            router.push("/login");
            setSaving(false);
            return;
        }

        const extension =
            file.name.includes(".")
                ? file.name
                    .split(".")
                    .pop()
                    .toLowerCase()
                : "file";

        const safeFileName =
            `${crypto.randomUUID()}.${extension}`;

        const storagePath =
            `${user.id}/${dogId}/${safeFileName}`;

        // -----------------------------
        // STORAGE UPLOAD
        // -----------------------------

        const {
            error: uploadError,
        } = await sb.storage
            .from("vet-documents")
            .upload(
                storagePath,
                file,
                {
                    cacheControl: "3600",
                    upsert: false,
                    contentType:
                        file.type,
                }
            );

        if (uploadError) {
            setMsg(
                `File upload failed: ${uploadError.message}`
            );

            setSaving(false);
            return;
        }

        const documentType =
            file.type ===
                "application/pdf"
                ? "PDF"
                : "Image";

        // -----------------------------
        // DATABASE
        // -----------------------------

        const {
            error: databaseError,
        } = await sb
            .from("vet_documents")
            .insert({
                dog_id: dogId,
                file_name: file.name,
                document_type:
                    documentType,
                storage_path:
                    storagePath,
                summary:
                    "Document uploaded successfully. AI analysis is ready.",
            });

        if (databaseError) {
            await sb.storage
                .from("vet-documents")
                .remove([
                    storagePath,
                ]);

            setMsg(
                `Database save failed: ${databaseError.message}`
            );

            setSaving(false);
            return;
        }

        setFile(null);

        const input =
            document.getElementById(
                "vet-document"
            );

        if (input) {
            input.value = "";
        }

        setMsg(
            "Veterinary document uploaded successfully. 📄"
        );

        await loadData();

        setSaving(false);
    }

    // --------------------------------
    // ANALYZE DOCUMENT WITH AI
    // --------------------------------

    async function analyzeDocument(
        documentId
    ) {
        if (!isPremium) {
            setMsg(
                "AI document analysis is available with Premium."
            );
            return;
        }

        setAnalyzingId(documentId);
        setMsg("");

        try {
            // -----------------------------
            // GET DOCUMENT
            // -----------------------------

            const {
                data,
                error,
            } = await sb
                .from("vet_documents")
                .select("*")
                .eq("id", documentId)
                .single();

            if (error) {
                setMsg(error.message);
                return;
            }

            if (!data) {
                setMsg(
                    "Veterinary document not found."
                );
                return;
            }

            if (!data.storage_path) {
                setMsg(
                    "This document has no storage file."
                );
                return;
            }

            // -----------------------------
            // SECURE SIGNED URL
            // -----------------------------

            const {
                data: signedData,
                error: signedError,
            } = await sb.storage
                .from("vet-documents")
                .createSignedUrl(
                    data.storage_path,
                    300
                );

            if (signedError) {
                setMsg(
                    `Could not access document: ${signedError.message}`
                );
                return;
            }

            const fileUrl =
                signedData?.signedUrl;

            if (!fileUrl) {
                setMsg(
                    "Could not create secure document URL."
                );
                return;
            }

            // -----------------------------
            // SEND TO AI API
            // -----------------------------

            const response =
                await fetch(
                    "/api/analyze-document",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body: JSON.stringify({
                            documentUrl:
                                fileUrl,

                            documentType:
                                data.document_type,

                            fileName:
                                data.file_name,
                        }),
                    }
                );

            const result =
                await response.json();

            if (!response.ok) {
                setMsg(
                    result.error ||
                    "AI analysis failed."
                );

                return;
            }

            // -----------------------------
            // AI RESULT
            // -----------------------------

            const analysis =
                result.analysis || {};

            // -----------------------------
            // SAVE AI RESULT
            // -----------------------------

            const {
                error: updateError,
            } = await sb
                .from("vet_documents")
                .update({
                    veterinarian_name:
                        analysis.veterinarian_name ||
                        null,

                    clinic_name:
                        analysis.clinic_name ||
                        null,

                    visit_date:
                        analysis.visit_date ||
                        null,

                    reason:
                        analysis.reason ||
                        null,

                    medications:
                        analysis.medications ||
                        null,

                    vaccinations:
                        analysis.vaccinations ||
                        null,

                    summary:
                        analysis.summary ||
                        null,

                    instructions:
                        analysis.instructions ||
                        null,
                })
                .eq(
                    "id",
                    documentId
                );

            if (updateError) {
                setMsg(
                    `AI analysis succeeded, but saving failed: ${updateError.message}`
                );

                return;
            }

            setMsg(
                "Veterinary document analyzed successfully. 🤖"
            );

            await loadData();

        } catch (error) {
            console.error(
                "Document analysis error:",
                error
            );

            setMsg(
                error?.message ||
                "Unable to analyze the document."
            );
        } finally {
            setAnalyzingId(null);
        }
    }

    // --------------------------------
    // DELETE DOCUMENT
    // --------------------------------

    async function deleteDocument(
        id,
        storagePath
    ) {
        const confirmed =
            window.confirm(
                "Are you sure you want to delete this veterinary document?"
            );

        if (!confirmed) {
            return;
        }

        setDeleting(true);
        setMsg("");

        // -----------------------------
        // DELETE STORAGE FILE
        // -----------------------------

        if (storagePath) {
            const {
                error: storageError,
            } = await sb.storage
                .from("vet-documents")
                .remove([
                    storagePath,
                ]);

            if (storageError) {
                setMsg(
                    `Storage delete failed: ${storageError.message}`
                );

                setDeleting(false);
                return;
            }
        }

        // -----------------------------
        // DELETE DATABASE RECORD
        // -----------------------------

        const {
            error: databaseError,
        } = await sb
            .from("vet_documents")
            .delete()
            .eq("id", id);

        if (databaseError) {
            setMsg(
                databaseError.message
            );

            setDeleting(false);
            return;
        }

        setMsg(
            "Veterinary document deleted successfully."
        );

        await loadData();

        setDeleting(false);
    }

    // --------------------------------
    // PAGE
    // --------------------------------

    return (
        <>
            <Sidebar />

            <main className="container">

                {/* BACK */}

                <button
                    className="btn"
                    type="button"
                    onClick={() =>
                        router.push(
                            "/dashboard"
                        )
                    }
                >
                    ← Back to Dashboard
                </button>

                <br />

                {/* TITLE */}

                <h1>
                    📄 AI Vet Document Scanner
                </h1>

                <p className="muted">
                    Upload veterinary documents
                    and keep important dog-care
                    information organized.
                </p>

                {/* PREMIUM CHECK */}

                {!isPremium ? (

                    <section
                        className="card"
                        style={{
                            marginTop: "24px",
                            borderRadius: "20px",
                            background:
                                "#fff8e8",
                            border:
                                "1px solid #f5c451",
                        }}
                    >

                        <h2>
                            🔒 Premium Feature
                        </h2>

                        <p>
                            AI Vet Document Scanner
                            is available with Premium.
                        </p>

                        <button
                            className="btn primary"
                            type="button"
                            onClick={() =>
                                router.push(
                                    "/dashboard"
                                )
                            }
                        >
                            ⭐ Upgrade to Premium →
                        </button>

                    </section>

                ) : (

                    <>

                        {/* ========================= */}
                        {/* UPLOAD */}
                        {/* ========================= */}

                        <section
                            className="card"
                        >

                            <h2>
                                📤 Upload Vet Document
                            </h2>

                            {loading ? (

                                <p className="muted">
                                    Loading...
                                </p>

                            ) : dogs.length === 0 ? (

                                <p className="muted">
                                    Please add a dog
                                    from the Dashboard
                                    first.
                                </p>

                            ) : (

                                <form
                                    className="form"
                                    onSubmit={
                                        saveDocument
                                    }
                                >

                                    <label htmlFor="dog-select">
                                        Dog
                                    </label>

                                    <select
                                        id="dog-select"
                                        className="input"
                                        value={dogId}
                                        onChange={(
                                            event
                                        ) =>
                                            setDogId(
                                                event
                                                    .target
                                                    .value
                                            )
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
                                                </option>

                                            )
                                        )}

                                    </select>

                                    <label
                                        htmlFor="vet-document"
                                        style={{
                                            display:
                                                "block",

                                            marginTop:
                                                "14px",

                                            marginBottom:
                                                "8px",

                                            fontWeight:
                                                "700",
                                        }}
                                    >
                                        Veterinary document
                                    </label>

                                    <input
                                        id="vet-document"
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                                        onChange={
                                            handleFileChange
                                        }
                                        style={{
                                            display:
                                                "block",

                                            width:
                                                "100%",

                                            padding:
                                                "12px",

                                            marginTop:
                                                "8px",

                                            marginBottom:
                                                "8px",

                                            border:
                                                "1px solid #d1d5db",

                                            borderRadius:
                                                "10px",

                                            background:
                                                "#ffffff",

                                            color:
                                                "#111827",

                                            cursor:
                                                "pointer",

                                            boxSizing:
                                                "border-box",
                                        }}
                                    />

                                    {file && (

                                        <p className="muted">
                                            📄 Selected:{" "}
                                            <strong>
                                                {
                                                    file.name
                                                }
                                            </strong>
                                        </p>

                                    )}

                                    <p className="muted">
                                        Supported:
                                        PDF, JPG, PNG,
                                        WEBP.
                                        Maximum 10 MB.
                                    </p>

                                    <button
                                        className="btn primary"
                                        type="submit"
                                        disabled={
                                            saving ||
                                            !file
                                        }
                                    >
                                        {saving
                                            ? "Uploading..."
                                            : "Upload Document →"}
                                    </button>

                                </form>

                            )}

                            {msg && (
                                <p className="muted">
                                    {msg}
                                </p>
                            )}

                        </section>

                        <br />

                        {/* ========================= */}
                        {/* DOCUMENT LIST */}
                        {/* ========================= */}

                        <section
                            className="card"
                        >

                            <h2>
                                📋 Veterinary Documents
                            </h2>

                            {documents.length === 0 ? (

                                <p className="muted">
                                    No veterinary
                                    documents yet.
                                    Upload your first
                                    document above.
                                </p>

                            ) : (

                                documents.map(
                                    (document) => (

                                        <div
                                            key={
                                                document.id
                                            }
                                            className="card"
                                            style={{
                                                marginTop:
                                                    "12px",

                                                background:
                                                    "#f9fbff",
                                            }}
                                        >

                                            <h3>
                                                📄{" "}
                                                {
                                                    document.file_name
                                                }
                                            </h3>

                                            <p className="muted">
                                                🐶{" "}
                                                {
                                                    getDogName(
                                                        document.dog_id
                                                    )
                                                }
                                            </p>

                                            {document.document_type && (
                                                <p>
                                                    📑 Type:{" "}
                                                    {
                                                        document.document_type
                                                    }
                                                </p>
                                            )}

                                            {document.visit_date && (
                                                <p>
                                                    📅 Visit date:{" "}
                                                    {
                                                        document.visit_date
                                                    }
                                                </p>
                                            )}

                                            {document.veterinarian_name && (
                                                <p>
                                                    🧑‍⚕️ Veterinarian:{" "}
                                                    {
                                                        document.veterinarian_name
                                                    }
                                                </p>
                                            )}

                                            {document.clinic_name && (
                                                <p>
                                                    🏥 Clinic:{" "}
                                                    {
                                                        document.clinic_name
                                                    }
                                                </p>
                                            )}

                                            {document.reason && (
                                                <p>
                                                    🩺 Reason:{" "}
                                                    {
                                                        document.reason
                                                    }
                                                </p>
                                            )}

                                            {document.medications && (
                                                <p>
                                                    💊 Medications:{" "}
                                                    {
                                                        document.medications
                                                    }
                                                </p>
                                            )}

                                            {document.vaccinations && (
                                                <p>
                                                    💉 Vaccinations:{" "}
                                                    {
                                                        document.vaccinations
                                                    }
                                                </p>
                                            )}

                                            {document.instructions && (
                                                <p>
                                                    📋 Instructions:{" "}
                                                    {
                                                        document.instructions
                                                    }
                                                </p>
                                            )}

                                            {document.summary && (
                                                <p>
                                                    📝{" "}
                                                    {
                                                        document.summary
                                                    }
                                                </p>
                                            )}

                                            {/* BUTTONS */}

                                            <div
                                                style={{
                                                    display:
                                                        "flex",

                                                    gap:
                                                        "10px",

                                                    flexWrap:
                                                        "wrap",

                                                    marginTop:
                                                        "14px",
                                                }}
                                            >

                                                <button
                                                    className="btn primary"
                                                    type="button"
                                                    disabled={
                                                        analyzingId ===
                                                        document.id ||
                                                        deleting
                                                    }
                                                    onClick={() =>
                                                        analyzeDocument(
                                                            document.id
                                                        )
                                                    }
                                                >
                                                    {analyzingId ===
                                                        document.id
                                                        ? "🤖 Analyzing..."
                                                        : "🤖 Analyze with AI"}
                                                </button>

                                                <button
                                                    className="btn"
                                                    type="button"
                                                    disabled={
                                                        deleting ||
                                                        analyzingId ===
                                                        document.id
                                                    }
                                                    onClick={() =>
                                                        deleteDocument(
                                                            document.id,
                                                            document.storage_path
                                                        )
                                                    }
                                                >
                                                    {deleting
                                                        ? "Deleting..."
                                                        : "Delete Document"}
                                                </button>

                                            </div>

                                        </div>

                                    )
                                )

                            )}

                        </section>

                    </>

                )}

            </main>
        </>
    );
}