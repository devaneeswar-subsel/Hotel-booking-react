import React, { useEffect, useState } from "react";

/*
 * SC-04: review moderation for admins.
 *
 * Reviews still go live as soon as a guest posts them (nothing changes for
 * guests). Here an admin can hide a review that is spam, abusive or fake, and
 * show it again later. Nothing is ever deleted.
 */
export default function ReviewsModeration({ apiFetch, showToast }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [filter, setFilter] = useState("all");

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/reviews");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load reviews");
      setReviews(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast?.(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggle(review) {
    setBusyId(review.review_id);
    try {
      const res = await apiFetch(`/api/admin/reviews/${review.review_id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_hidden: !Number(review.is_hidden) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      setReviews((list) =>
        list.map((r) =>
          r.review_id === review.review_id
            ? { ...r, is_hidden: data.is_hidden }
            : r,
        ),
      );
      showToast?.(data.message, "success");
    } catch (err) {
      showToast?.(err.message, "error");
    } finally {
      setBusyId(null);
    }
  }

  const shown = reviews.filter((r) =>
    filter === "hidden"
      ? Number(r.is_hidden) === 1
      : filter === "visible"
        ? Number(r.is_hidden) !== 1
        : true,
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-display text-[1rem] font-semibold text-navy">
            Guest Reviews
          </div>
          <p className="m-0 mt-1 text-xs text-gray-500">
            Reviews go live when guests post them. Hide any that are spam,
            abusive or fake — hidden reviews are kept, just not shown on the
            website.
          </p>
        </div>
        <div className="flex gap-2">
          {[
            ["all", "All"],
            ["visible", "Visible"],
            ["hidden", "Hidden"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
                filter === id
                  ? "border-navy bg-navy text-white"
                  : "border-gray-200 bg-white text-gray-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-gray-500">
          Loading reviews…
        </div>
      ) : shown.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-10 text-center text-sm text-gray-500">
          No reviews here.
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((r) => {
            const hidden = Number(r.is_hidden) === 1;
            return (
              <div
                key={r.review_id}
                className={`rounded-xl border bg-white p-4 ${
                  hidden ? "border-gray-200 opacity-60" : "border-gray-200"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">
                      {r.guest_name}{" "}
                      <span className="font-normal text-gray-500">
                        · {r.room_type} · booking #{r.booking_id}
                      </span>
                    </div>
                    <div
                      className="mt-0.5 text-sm text-[#C9A84C]"
                      aria-label={`${r.rating} out of 5`}
                    >
                      {"★".repeat(Number(r.rating) || 0)}
                      <span className="text-gray-300">
                        {"★".repeat(5 - (Number(r.rating) || 0))}
                      </span>
                      <span className="ml-2 text-xs text-gray-400">
                        {String(r.created_at || "").slice(0, 10)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={busyId === r.review_id}
                    onClick={() => toggle(r)}
                    className={`rounded-md border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                      hidden
                        ? "border-green-600 text-green-700 hover:bg-green-50"
                        : "border-red-600 text-red-700 hover:bg-red-50"
                    }`}
                  >
                    {hidden ? "Show on site" : "Hide from site"}
                  </button>
                </div>
                <p className="m-0 mt-2 whitespace-pre-line text-sm text-gray-700">
                  {r.review_text}
                </p>
                {hidden && (
                  <div className="mt-2 text-xs font-semibold text-gray-500">
                    Hidden from the website
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
