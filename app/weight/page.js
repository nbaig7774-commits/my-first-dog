"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import { createClient } from "../../lib/supabase";
import { hasPremiumAccess } from "../../lib/planAccess";

export default function WeightPage() {
    const sb = createClient();
    const router = useRouter();

    const [dogs, setDogs] = useState([]);
    const [weightRecords, setWeightRecords] = useState([]);

    const [dogId, setDogId] = useState("");
    const [weight, setWeight] = useState("");
    const [recordedAt, setRecordedAt] = useState("");
    const [notes, setNotes] = useState("");

    const [subscriptionPlan, setSubscriptionPlan] =
        useState("none");

    const [subscriptionStatus, setSubscriptionStatus] =
        useState("inactive");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [msg, setMsg] = useState("");

    /*
     * =====================================================
     * LOAD DATA
     * =====================================================
     */

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        setMsg("");

        try {
            const {
                data: { user },
            } = await sb.auth.getUser();

            if (!user) {
                router.push("/login");
                return;
            }

            /*
             * GET DOG FROM URL
             */

            let urlDogId = null;

            if (typeof window !== "undefined") {
                const params = new URLSearchParams(
                    window.location.search
                );

                urlDogId = params.get("dog");
            }

            /*
             * LOAD SUBSCRIPTION
             */

            const profileResult = await sb
                .from("profiles")
                .select(
                    "subscription_plan, subscription_status"
                )
                .eq("id", user.id)
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

            /*
             * LOAD DOGS
             */

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
                throw new Error(
                    dogError.message
                );
            }

            const allDogs = dogData || [];

            setDogs(allDogs);

            /*
             * SELECT DOG
             */

            const validUrlDog =
                urlDogId &&
                    allDogs.some(
                        (dog) => dog.id === urlDogId
                    )
                    ? urlDogId
                    : null;

            const selectedDogId =
                validUrlDog ||
                (allDogs.length > 0
                    ? allDogs[0].id
                    : "");

            setDogId(selectedDogId);

            /*
             * LOAD WEIGHT RECORDS
             */

            if (selectedDogId) {
                const {
                    data,
                    error,
                } = await sb
                    .from("dog_weight_records")
                    .select(
                        "id, dog_id, weight, recorded_at, notes, created_at"
                    )
                    .eq(
                        "dog_id",
                        selectedDogId
                    )
                    .order("recorded_at", {
                        ascending: false,
                    });

                if (error) {
                    throw new Error(
                        error.message
                    );
                }

                setWeightRecords(
                    data || []
                );
            } else {
                setWeightRecords([]);
            }
        } catch (error) {
            console.error(
                "Weight page loading error:",
                error
            );

            setMsg(
                error.message ||
                "Unable to load weight information."
            );
        } finally {
            setLoading(false);
        }
    }

    /*
     * =====================================================
     * PREMIUM ACCESS
     * =====================================================
     */

    const isPremium =
        subscriptionStatus === "active" &&
        hasPremiumAccess(subscriptionPlan);

    /*
     * =====================================================
     * SELECTED DOG
     * =====================================================
     */

    const selectedDog = dogs.find(
        (dog) => dog.id === dogId
    );

    /*
     * =====================================================
     * CHANGE DOG
     * =====================================================
     */

    async function changeDog(newDogId) {
        setDogId(newDogId);
        setMsg("");

        router.replace(
            `/weight?dog=${newDogId}`
        );

        setLoading(true);

        try {
            const {
                data,
                error,
            } = await sb
                .from("dog_weight_records")
                .select(
                    "id, dog_id, weight, recorded_at, notes, created_at"
                )
                .eq(
                    "dog_id",
                    newDogId
                )
                .order("recorded_at", {
                    ascending: false,
                });

            if (error) {
                throw new Error(
                    error.message
                );
            }

            setWeightRecords(
                data || []
            );
        } catch (error) {
            console.error(
                "Weight records loading error:",
                error
            );

            setWeightRecords([]);

            setMsg(
                error.message ||
                "Unable to load weight records."
            );
        } finally {
            setLoading(false);
        }
    }

    /*
     * =====================================================
     * SAVE WEIGHT
     * =====================================================
     */

    async function saveWeight(event) {
        event.preventDefault();

        setMsg("");

        if (!isPremium) {
            setMsg(
                "Weight & Health Trends is available with Premium."
            );
            return;
        }

        if (!dogId) {
            setMsg(
                "Please select a dog first."
            );
            return;
        }

        if (!weight) {
            setMsg(
                "Please enter your dog's weight."
            );
            return;
        }

        const numericWeight =
            Number(weight);

        if (
            Number.isNaN(numericWeight) ||
            numericWeight <= 0
        ) {
            setMsg(
                "Please enter a valid weight greater than 0."
            );
            return;
        }

        if (!recordedAt) {
            setMsg(
                "Please select a date."
            );
            return;
        }

        setSaving(true);

        try {
            const {
                data: { user },
            } = await sb.auth.getUser();

            if (!user) {
                router.push("/login");
                return;
            }

            const {
                error,
            } = await sb
                .from("dog_weight_records")
                .insert({
                    dog_id: dogId,
                    weight: numericWeight,
                    recorded_at: recordedAt,
                    notes:
                        notes.trim() ||
                        null,
                });

            if (error) {
                throw new Error(
                    error.message
                );
            }

            setWeight("");
            setRecordedAt("");
            setNotes("");

            setMsg(
                "Weight record saved successfully. ⚖️"
            );

            await loadData();
        } catch (error) {
            console.error(
                "Save weight error:",
                error
            );

            setMsg(
                error.message ||
                "Unable to save weight record."
            );
        } finally {
            setSaving(false);
        }
    }

    /*
     * =====================================================
     * DELETE WEIGHT
     * =====================================================
     */

    async function deleteWeight(id) {
        const confirmed =
            window.confirm(
                "Are you sure you want to delete this weight record?"
            );

        if (!confirmed) {
            return;
        }

        setDeleting(true);
        setMsg("");

        try {
            const {
                error,
            } = await sb
                .from("dog_weight_records")
                .delete()
                .eq("id", id);

            if (error) {
                throw new Error(
                    error.message
                );
            }

            setMsg(
                "Weight record deleted successfully."
            );

            await loadData();
        } catch (error) {
            console.error(
                "Delete weight error:",
                error
            );

            setMsg(
                error.message ||
                "Unable to delete weight record."
            );
        } finally {
            setDeleting(false);
        }
    }

    /*
     * =====================================================
     * WEIGHT INSIGHTS
     * =====================================================
     */

    const weightInsight = useMemo(() => {
        if (
            weightRecords.length === 0
        ) {
            return {
                latest: null,
                previous: null,
                change: null,
                percentChange: null,
            };
        }

        const latest =
            Number(
                weightRecords[0].weight
            );

        const previous =
            weightRecords.length > 1
                ? Number(
                    weightRecords[1].weight
                )
                : null;

        const change =
            previous !== null
                ? latest - previous
                : null;

        const percentChange =
            previous &&
                previous > 0 &&
                change !== null
                ? (change /
                    previous) *
                100
                : null;

        return {
            latest,
            previous,
            change,
            percentChange,
        };
    }, [weightRecords]);

    /*
     * =====================================================
     * TREND DATA
     * =====================================================
     */

    const trendRecords = useMemo(() => {
        return [...weightRecords]
            .sort(
                (a, b) =>
                    new Date(
                        a.recorded_at
                    ) -
                    new Date(
                        b.recorded_at
                    )
            );
    }, [weightRecords]);

    const trendStats = useMemo(() => {
        if (
            trendRecords.length < 2
        ) {
            return {
                first: null,
                latest: null,
                difference: null,
                direction: "none",
            };
        }

        const first =
            Number(
                trendRecords[0].weight
            );

        const latest =
            Number(
                trendRecords[
                    trendRecords.length - 1
                ].weight
            );

        const difference =
            latest - first;

        let direction = "same";

        if (difference > 0) {
            direction = "up";
        } else if (
            difference < 0
        ) {
            direction = "down";
        }

        return {
            first,
            latest,
            difference,
            direction,
        };
    }, [trendRecords]);

    /*
     * =====================================================
     * PAGE
     * =====================================================
     */

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
                            dogId
                                ? `/dogs/${dogId}`
                                : "/dashboard"
                        )
                    }
                >
                    ← Back to Dog Profile
                </button>

                <br />

                {/* HEADER */}

                <h1>
                    ⚖️ Weight
                </h1>

                <p className="muted">
                    Track your dog's weight and
                    monitor changes over time.
                </p>

                {/* =================================================
                    DOG SELECTOR
                ================================================= */}

                <section className="card">

                    <h2>
                        🐶 Select Dog
                    </h2>

                    {loading &&
                        dogs.length === 0 ? (
                        <p className="muted">
                            Loading dogs...
                        </p>
                    ) : dogs.length === 0 ? (
                        <div>
                            <p className="muted">
                                Please add a dog
                                from the Dashboard
                                first.
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
                                Add Your Dog →
                            </button>
                        </div>
                    ) : (
                        <select
                            className="input"
                            value={dogId}
                            onChange={(event) =>
                                changeDog(
                                    event.target.value
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
                                        {dog.name}
                                        {dog.breed
                                            ? ` — ${dog.breed}`
                                            : ""}
                                    </option>
                                )
                            )}
                        </select>
                    )}

                    {selectedDog && (
                        <p className="muted">
                            Tracking weight for{" "}
                            <strong>
                                {
                                    selectedDog.name
                                }
                            </strong>
                            .
                        </p>
                    )}

                </section>

                <br />

                {/* =================================================
                    PREMIUM FEATURE
                ================================================= */}

                <section
                    className="card"
                    style={{
                        borderRadius:
                            "22px",
                        background:
                            isPremium
                                ? "#f7fbff"
                                : "#fff8e8",
                        border:
                            isPremium
                                ? "1px solid #cfe5ff"
                                : "2px solid #f5c451",
                    }}
                >

                    <h2>
                        📊 Weight & Health Trends
                    </h2>

                    {!isPremium ? (

                        <>

                            <p>
                                🔒{" "}
                                <strong>
                                    Premium Feature
                                </strong>
                            </p>

                            <p className="muted">
                                Upgrade to Premium
                                to unlock detailed
                                weight tracking,
                                weight history and
                                health trend insights.
                            </p>

                            <div
                                style={{
                                    display:
                                        "grid",
                                    gap: "8px",
                                    marginTop:
                                        "15px",
                                }}
                            >
                                <p>
                                    ⚖️ Weight tracking
                                </p>

                                <p>
                                    📈 Weight trends
                                </p>

                                <p>
                                    📊 Weight change
                                    analysis
                                </p>

                                <p>
                                    ❤️ Care insights
                                </p>
                            </div>

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

                        </>

                    ) : (

                        <>

                            {/* SUMMARY CARDS */}

                            <div
                                style={{
                                    display:
                                        "grid",
                                    gridTemplateColumns:
                                        "repeat(auto-fit, minmax(180px, 1fr))",
                                    gap: "14px",
                                    marginTop:
                                        "18px",
                                }}
                            >

                                <div
                                    className="card"
                                    style={{
                                        margin: 0,
                                        background:
                                            "#ffffff",
                                    }}
                                >

                                    <div className="stat">
                                        ⚖️{" "}
                                        {weightInsight.latest !==
                                            null
                                            ? `${weightInsight.latest} kg`
                                            : "—"}
                                    </div>

                                    <strong>
                                        Current Weight
                                    </strong>

                                    <p className="muted">
                                        Latest recorded
                                        measurement
                                    </p>

                                </div>


                                <div
                                    className="card"
                                    style={{
                                        margin: 0,
                                        background:
                                            "#ffffff",
                                    }}
                                >

                                    <div className="stat">
                                        📊{" "}
                                        {
                                            weightRecords.length
                                        }
                                    </div>

                                    <strong>
                                        Weight Records
                                    </strong>

                                    <p className="muted">
                                        Total measurements
                                    </p>

                                </div>


                                <div
                                    className="card"
                                    style={{
                                        margin: 0,
                                        background:
                                            "#ffffff",
                                    }}
                                >

                                    <div className="stat">
                                        {weightInsight.change ===
                                            null
                                            ? "—"
                                            : weightInsight.change >
                                                0
                                                ? `+${weightInsight.change.toFixed(
                                                    2
                                                )} kg`
                                                : `${weightInsight.change.toFixed(
                                                    2
                                                )} kg`}
                                    </div>

                                    <strong>
                                        Recent Change
                                    </strong>

                                    <p className="muted">
                                        Compared with
                                        previous record
                                    </p>

                                </div>


                                <div
                                    className="card"
                                    style={{
                                        margin: 0,
                                        background:
                                            "#ffffff",
                                    }}
                                >

                                    <div className="stat">

                                        {trendStats.direction ===
                                            "up"
                                            ? "⬆️"
                                            : trendStats.direction ===
                                                "down"
                                                ? "⬇️"
                                                : trendStats.direction ===
                                                    "same"
                                                    ? "➡️"
                                                    : "—"}

                                    </div>

                                    <strong>
                                        Overall Trend
                                    </strong>

                                    <p className="muted">

                                        {trendStats.direction ===
                                            "up"
                                            ? "Weight increasing"
                                            : trendStats.direction ===
                                                "down"
                                                ? "Weight decreasing"
                                                : trendStats.direction ===
                                                    "same"
                                                    ? "Weight stable"
                                                    : "Need more records"}

                                    </p>

                                </div>

                            </div>


                            {/* HEALTH INSIGHT */}

                            <div
                                style={{
                                    marginTop:
                                        "20px",
                                    padding:
                                        "18px",
                                    borderRadius:
                                        "16px",
                                    background:
                                        "#ffffff",
                                }}
                            >

                                <h3>
                                    ❤️ Health Insight
                                </h3>

                                {weightRecords.length ===
                                    0 ? (

                                    <p className="muted">
                                        Add your first
                                        weight record
                                        to begin tracking
                                        your dog's trend.
                                    </p>

                                ) : weightRecords.length ===
                                    1 ? (

                                    <p className="muted">
                                        One weight record
                                        is saved. Add
                                        another measurement
                                        to compare changes
                                        over time.
                                    </p>

                                ) : (

                                    <>

                                        <p>
                                            {trendStats.direction ===
                                                "up"
                                                ? `⬆️ ${selectedDog?.name || "Your dog"} has gained ${Math.abs(
                                                    trendStats.difference
                                                ).toFixed(
                                                    2
                                                )} kg since the first recorded measurement.`
                                                : trendStats.direction ===
                                                    "down"
                                                    ? `⬇️ ${selectedDog?.name || "Your dog"} has decreased by ${Math.abs(
                                                        trendStats.difference
                                                    ).toFixed(
                                                        2
                                                    )} kg since the first recorded measurement.`
                                                    : `➡️ ${selectedDog?.name || "Your dog"} has the same recorded weight as the first measurement.`}
                                        </p>

                                        <p
                                            className="muted"
                                        >
                                            Weight tracking
                                            helps keep a
                                            useful record
                                            for discussions
                                            with your
                                            veterinarian.
                                        </p>

                                    </>

                                )}

                            </div>

                        </>

                    )}

                </section>

                <br />

                {/* =================================================
                    ADD WEIGHT
                ================================================= */}

                <section className="card">

                    <h2>
                        ➕ Add Weight Record
                    </h2>

                    {!isPremium ? (

                        <div
                            style={{
                                padding:
                                    "16px",
                                borderRadius:
                                    "16px",
                                background:
                                    "#fff8e8",
                                border:
                                    "1px solid #f5c451",
                            }}
                        >

                            <p>
                                🔒 Weight recording
                                is a Premium feature.
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

                        </div>

                    ) : dogs.length === 0 ? (

                        <p className="muted">
                            Add your first dog
                            before recording
                            weight.
                        </p>

                    ) : (

                        <form
                            className="form"
                            onSubmit={
                                saveWeight
                            }
                        >

                            <label>
                                Dog
                            </label>

                            <select
                                className="input"
                                value={dogId}
                                onChange={(
                                    event
                                ) =>
                                    changeDog(
                                        event.target
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


                            <label>
                                Weight (kg)
                            </label>

                            <input
                                className="input"
                                type="number"
                                min="0.01"
                                step="0.01"
                                placeholder="Example: 30.50"
                                value={weight}
                                onChange={(
                                    event
                                ) =>
                                    setWeight(
                                        event.target
                                            .value
                                    )
                                }
                                required
                            />


                            <label>
                                Date
                            </label>

                            <input
                                className="input"
                                type="date"
                                value={
                                    recordedAt
                                }
                                onChange={(
                                    event
                                ) =>
                                    setRecordedAt(
                                        event.target
                                            .value
                                    )
                                }
                                required
                            />


                            <label>
                                Notes
                            </label>

                            <textarea
                                className="input"
                                rows={4}
                                placeholder="Optional notes about your dog's weight..."
                                value={notes}
                                onChange={(
                                    event
                                ) =>
                                    setNotes(
                                        event.target
                                            .value
                                    )
                                }
                            />


                            <button
                                className="btn primary"
                                type="submit"
                                disabled={
                                    saving
                                }
                            >
                                {saving
                                    ? "Saving..."
                                    : "Save Weight Record"}
                            </button>

                        </form>

                    )}

                    {msg && (
                        <div
                            style={{
                                marginTop:
                                    "15px",
                                padding:
                                    "12px 15px",
                                borderRadius:
                                    "12px",
                                background:
                                    "#f7f9fc",
                            }}
                        >
                            <p
                                style={{
                                    margin: 0,
                                }}
                            >
                                {msg}
                            </p>
                        </div>
                    )}

                </section>

                <br />

                {/* =================================================
                    WEIGHT TREND
                ================================================= */}

                {isPremium && (
                    <>
                        <section className="card">

                            <h2>
                                📈 Weight Trend
                            </h2>

                            <p className="muted">
                                Visualize{" "}
                                {selectedDog?.name ||
                                    "your dog's"}{" "}
                                weight changes over
                                time.
                            </p>

                            {trendRecords.length <
                                2 ? (

                                <div
                                    style={{
                                        padding:
                                            "20px",
                                        marginTop:
                                            "15px",
                                        borderRadius:
                                            "16px",
                                        background:
                                            "#f7f9fc",
                                        textAlign:
                                            "center",
                                    }}
                                >

                                    <p>
                                        📊 Add at least
                                        two weight
                                        records to see
                                        the trend.
                                    </p>

                                    <p className="muted">
                                        Your weight
                                        history will
                                        appear here as
                                        you add more
                                        measurements.
                                    </p>

                                </div>

                            ) : (

                                <div
                                    style={{
                                        marginTop:
                                            "20px",
                                        padding:
                                            "20px",
                                        borderRadius:
                                            "18px",
                                        background:
                                            "#f7f9fc",
                                        overflowX:
                                            "auto",
                                    }}
                                >

                                    {/* CHART */}

                                    <div
                                        style={{
                                            minWidth:
                                                Math.max(
                                                    520,
                                                    trendRecords.length *
                                                    90
                                                ),
                                            height:
                                                "300px",
                                            display:
                                                "flex",
                                            alignItems:
                                                "flex-end",
                                            gap:
                                                "18px",
                                            padding:
                                                "10px 10px 35px",
                                        }}
                                    >

                                        {trendRecords.map(
                                            (
                                                record
                                            ) => {

                                                const weights =
                                                    trendRecords.map(
                                                        (
                                                            item
                                                        ) =>
                                                            Number(
                                                                item.weight
                                                            )
                                                    );

                                                const minWeight =
                                                    Math.min(
                                                        ...weights
                                                    );

                                                const maxWeight =
                                                    Math.max(
                                                        ...weights
                                                    );

                                                const range =
                                                    maxWeight -
                                                    minWeight;

                                                const barHeight =
                                                    range ===
                                                        0
                                                        ? 120
                                                        : 70 +
                                                        ((Number(
                                                            record.weight
                                                        ) -
                                                            minWeight) /
                                                            range) *
                                                        150;

                                                return (
                                                    <div
                                                        key={
                                                            record.id
                                                        }
                                                        style={{
                                                            minWidth:
                                                                "70px",
                                                            height:
                                                                "260px",
                                                            display:
                                                                "flex",
                                                            flexDirection:
                                                                "column",
                                                            justifyContent:
                                                                "flex-end",
                                                            alignItems:
                                                                "center",
                                                        }}
                                                    >

                                                        <strong
                                                            style={{
                                                                fontSize:
                                                                    "13px",
                                                                marginBottom:
                                                                    "7px",
                                                            }}
                                                        >
                                                            {
                                                                record.weight
                                                            }{" "}
                                                            kg
                                                        </strong>

                                                        <div
                                                            style={{
                                                                width:
                                                                    "42px",
                                                                height: `${barHeight}px`,
                                                                background:
                                                                    "#f5c451",
                                                                borderRadius:
                                                                    "10px 10px 4px 4px",
                                                                transition:
                                                                    "height 0.3s ease",
                                                            }}
                                                        />

                                                        <span
                                                            className="muted"
                                                            style={{
                                                                fontSize:
                                                                    "11px",
                                                                marginTop:
                                                                    "8px",
                                                                whiteSpace:
                                                                    "nowrap",
                                                            }}
                                                        >
                                                            {
                                                                record.recorded_at
                                                            }
                                                        </span>

                                                    </div>
                                                );
                                            }
                                        )}

                                    </div>

                                    {/* TREND SUMMARY */}

                                    <div
                                        style={{
                                            marginTop:
                                                "15px",
                                            padding:
                                                "15px",
                                            borderRadius:
                                                "14px",
                                            background:
                                                "#ffffff",
                                            textAlign:
                                                "center",
                                        }}
                                    >

                                        {trendStats.direction ===
                                            "up" ? (

                                            <strong>
                                                ⬆️ Overall
                                                weight
                                                trend:
                                                increasing
                                            </strong>

                                        ) : trendStats.direction ===
                                            "down" ? (

                                            <strong>
                                                ⬇️ Overall
                                                weight
                                                trend:
                                                decreasing
                                            </strong>

                                        ) : (

                                            <strong>
                                                ➡️ Overall
                                                weight
                                                trend:
                                                stable
                                            </strong>

                                        )}

                                    </div>

                                </div>

                            )}

                        </section>

                        <br />
                    </>
                )}

                {/* =================================================
                    WEIGHT HISTORY
                ================================================= */}

                {isPremium && (
                    <section className="card">

                        <h2>
                            📋 Weight History
                        </h2>

                        {loading ? (

                            <p className="muted">
                                Loading weight history...
                            </p>

                        ) : weightRecords.length ===
                            0 ? (

                            <div
                                style={{
                                    padding:
                                        "20px",
                                    borderRadius:
                                        "16px",
                                    background:
                                        "#f7f9fc",
                                    textAlign:
                                        "center",
                                }}
                            >

                                <p>
                                    No weight records
                                    yet.
                                </p>

                                <p className="muted">
                                    Add your first
                                    weight record
                                    above.
                                </p>

                            </div>

                        ) : (

                            weightRecords.map(
                                (record) => (

                                    <div
                                        key={
                                            record.id
                                        }
                                        className="card"
                                        style={{
                                            marginTop:
                                                "12px",
                                            background:
                                                "#f9fbff",
                                        }}
                                    >

                                        <div
                                            style={{
                                                display:
                                                    "flex",
                                                justifyContent:
                                                    "space-between",
                                                alignItems:
                                                    "center",
                                                gap:
                                                    "15px",
                                                flexWrap:
                                                    "wrap",
                                            }}
                                        >

                                            <div>

                                                <h3>
                                                    ⚖️{" "}
                                                    {
                                                        record.weight
                                                    }{" "}
                                                    kg
                                                </h3>

                                                <p className="muted">
                                                    🐶{" "}
                                                    {selectedDog
                                                        ? selectedDog.name
                                                        : "Dog"}
                                                </p>

                                                <p>
                                                    📅{" "}
                                                    {
                                                        record.recorded_at
                                                    }
                                                </p>

                                                {record.notes && (
                                                    <p>
                                                        📝{" "}
                                                        {
                                                            record.notes
                                                        }
                                                    </p>
                                                )}

                                            </div>

                                            <button
                                                className="btn"
                                                type="button"
                                                onClick={() =>
                                                    deleteWeight(
                                                        record.id
                                                    )
                                                }
                                                disabled={
                                                    deleting
                                                }
                                            >
                                                {deleting
                                                    ? "Deleting..."
                                                    : "Delete"}
                                            </button>

                                        </div>

                                    </div>

                                )
                            )

                        )}

                    </section>
                )}

                <br />

                {/* DISCLAIMER */}

                {isPremium && (
                    <section
                        className="card"
                        style={{
                            background:
                                "#f7f9fc",
                            textAlign:
                                "center",
                        }}
                    >

                        <p
                            className="muted"
                            style={{
                                margin: 0,
                                fontSize:
                                    "13px",
                            }}
                        >
                            ⚠️ Weight trends are
                            informational only and
                            do not provide a veterinary
                            diagnosis. Discuss
                            significant or concerning
                            changes with a qualified
                            veterinarian.
                        </p>

                    </section>
                )}

            </main>
        </>
    );
}