import React, { useState } from 'react';
import { useForm, usePage, router } from '@inertiajs/react';
import {
    Star, ThumbsUp, ThumbsDown, MessageSquare, Reply, Trash2, Send, CornerDownRight, CheckCircle2, User, Sparkles, X, Eye, EyeOff, AlertTriangle
} from 'lucide-react';

function SpoilerToggle({ checked, onChange, label = "Spoiler (Sürpriz Bozan) İçeriyor" }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={`group inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer select-none self-start sm:self-auto ${checked
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-500 dark:text-amber-400 shadow-sm shadow-amber-500/10 ring-1 ring-amber-500/20'
                : 'bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400 hover:border-amber-500/40 hover:text-slate-700 dark:hover:text-gray-300'
                }`}
        >
            <div className={`relative w-7 h-4 rounded-full transition-colors duration-200 shrink-0 ${checked ? 'bg-amber-500' : 'bg-slate-300 dark:bg-white/20'
                }`}>
                <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform duration-200 shadow-sm ${checked ? 'translate-x-3' : 'translate-x-0'
                    }`} />
            </div>

            <div className="flex items-center gap-1.5">
                <AlertTriangle className={`w-3.5 h-3.5 transition-colors ${checked ? 'text-amber-500 fill-amber-500/20 animate-pulse' : 'text-slate-400 dark:text-gray-500 group-hover:text-amber-500'
                    }`} />
                <span>{label}</span>
            </div>
        </button>
    );
}

export default function MovieComments({ movieId, comments = [], userRatingAvg, userRatingCount }) {
    const { auth } = usePage().props;
    const currentUser = auth?.user;

    const [userRating, setUserRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [replyingToId, setReplyingToId] = useState(null);
    const [guestName, setGuestName] = useState('');
    const [replyGuestName, setReplyGuestName] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Form for new main comment
    const mainForm = useForm({
        tmdb_title_id: movieId,
        rating: 0,
        content: '',
        guest_name: '',
        parent_id: null,
        is_spoiler: false,
    });

    // Form for reply
    const replyForm = useForm({
        tmdb_title_id: movieId,
        content: '',
        guest_name: '',
        parent_id: null,
        is_spoiler: false,
    });

    const handleMainSubmit = (e) => {
        e.preventDefault();
        if (!mainForm.data.content.trim()) return;

        mainForm.transform((data) => ({
            ...data,
            tmdb_title_id: movieId,
            rating: userRating > 0 ? userRating : null,
            guest_name: currentUser ? '' : guestName,
        }));

        mainForm.post('/comments', {
            preserveScroll: true,
            onSuccess: () => {
                mainForm.reset('content', 'is_spoiler');
                setUserRating(0);
                setSuccessMessage('Yorumunuz başarıyla yayınlandı!');
                setTimeout(() => setSuccessMessage(''), 4000);
            },
        });
    };

    const handleReplySubmit = (e, parentId) => {
        e.preventDefault();
        if (!replyForm.data.content.trim()) return;

        replyForm.transform((data) => ({
            ...data,
            tmdb_title_id: movieId,
            parent_id: parentId,
            guest_name: currentUser ? '' : replyGuestName,
        }));

        replyForm.post('/comments', {
            preserveScroll: true,
            onSuccess: () => {
                replyForm.reset('content', 'is_spoiler');
                setReplyingToId(null);
                setSuccessMessage('Yanıtınız eklendi!');
                setTimeout(() => setSuccessMessage(''), 4000);
            },
        });
    };

    const handleReaction = (commentId, type) => {
        router.post(`/comments/${commentId}/react`, { type }, { preserveScroll: true });
    };

    const handleDelete = (commentId) => {
        if (confirm('Bu yorumu silmek istediğinize emin misiniz?')) {
            router.delete(`/comments/${commentId}`, { preserveScroll: true });
        }
    };

    // Calculate total count including replies
    const countAllComments = (items) => {
        let total = items.length;
        items.forEach(item => {
            if (item.replies && item.replies.length > 0) {
                total += countAllComments(item.replies);
            }
        });
        return total;
    };

    const totalCount = countAllComments(comments);

    return (
        <div className="space-y-8">
            {/* Header / Rating Summary */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-[#0A0D14] p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#00B074]/15 border border-[#00B074]/30 flex items-center justify-center text-[#00B074]">
                        <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>İncelemeler ve Yorumlar</span>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-[#00B074]/20 text-[#00B074]">
                                {totalCount}
                            </span>
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-gray-400">
                            Film hakkındaki görüşlerinizi yazın, puan verin ve diğer izleyicilerle tartışın.
                        </p>
                    </div>
                </div>

                {userRatingAvg ? (
                    <div className="flex items-center gap-3 bg-white dark:bg-[#0c0e14] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 self-start sm:self-auto">
                        <div className="flex items-center gap-1.5 text-amber-400 font-black text-lg">
                            <Star className="w-5 h-5 fill-amber-400" />
                            <span>{userRatingAvg}</span>
                            <span className="text-xs font-normal text-slate-400 dark:text-gray-500">/10</span>
                        </div>
                        <div className="w-px h-6 bg-slate-200 dark:bg-white/10" />
                        <div className="text-xs">
                            <span className="block font-bold text-slate-900 dark:text-white">SineKutu Kullanıcı Puanı</span>
                            <span className="text-slate-500 dark:text-gray-400 text-[11px]">{userRatingCount} oy kullanıldı</span>
                        </div>
                    </div>
                ) : null}
            </div>

            {/* Success Toast */}
            {successMessage && (
                <div className="flex items-center gap-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 px-4 py-3 rounded-xl text-xs font-semibold animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{successMessage}</span>
                </div>
            )}

            {/* Write Main Review/Comment Box */}
            <form onSubmit={handleMainSubmit} className="bg-white dark:bg-[#0c0e14] p-6 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#00B074]" />
                        <span>Bir Yorum veya İnceleme Ekle</span>
                    </h4>
                    {currentUser && (
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-gray-400">
                            <User className="w-3.5 h-3.5 text-[#00B074]" />
                            <span><strong className="text-slate-900 dark:text-white">{currentUser.name}</strong> olarak yorum yapıyorsunuz</span>
                        </div>
                    )}
                </div>

                {/* Rating Selection */}
                <div className="flex flex-wrap items-center gap-3 bg-slate-50 dark:bg-[#0A0D14] p-3 rounded-xl border border-slate-200/60 dark:border-white/5">
                    <span className="text-slate-600 dark:text-gray-300 text-xs font-semibold">Filme Puanınız:</span>
                    <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => {
                            const isFilled = star <= (hoverRating || userRating);
                            return (
                                <button
                                    type="button"
                                    key={star}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    onClick={() => setUserRating(star === userRating ? 0 : star)}
                                    className={`p-1 transition-transform hover:scale-125 cursor-pointer ${isFilled ? 'text-amber-400' : 'text-slate-300 dark:text-gray-700 hover:text-amber-300'
                                        }`}
                                    title={`${star}/10`}
                                >
                                    <Star className={`w-4 h-4 ${isFilled ? 'fill-amber-400' : ''}`} />
                                </button>
                            );
                        })}
                    </div>
                    {userRating > 0 && (
                        <div className="flex items-center gap-2 ml-auto">
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-amber-400/20 text-amber-500 dark:text-amber-400 border border-amber-400/30">
                                {userRating} / 10
                            </span>
                            <button
                                type="button"
                                onClick={() => setUserRating(0)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs underline"
                            >
                                Temizle
                            </button>
                        </div>
                    )}
                </div>

                {/* Guest Name Input (Only if guest) */}
                {!currentUser && (
                    <div>
                        <input
                            type="text"
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            placeholder="Adınız (İsteğe bağlı, Varsayılan: Sinemasever)"
                            className="w-full sm:w-72 bg-slate-50 dark:bg-[#0A0D14] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-[#00B074] transition-colors"
                        />
                    </div>
                )}

                {/* Textarea */}
                <div>
                    <textarea
                        value={mainForm.data.content}
                        onChange={(e) => mainForm.setData('content', e.target.value)}
                        placeholder="Film hakkındaki duygu ve düşüncelerinizi detaylıca paylaşın..."
                        rows={3}
                        className="w-full bg-slate-50 dark:bg-[#0A0D14] border border-slate-200 dark:border-white/10 rounded-xl p-4 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-[#00B074] transition-colors resize-y min-h-[90px]"
                    />
                    {mainForm.errors.content && (
                        <p className="text-red-500 text-xs mt-1 font-medium">{mainForm.errors.content}</p>
                    )}
                </div>

                {/* Spoiler Option & Submit */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <SpoilerToggle
                        checked={mainForm.data.is_spoiler}
                        onChange={(val) => mainForm.setData('is_spoiler', val)}
                        label="Bu yorum spoiler (sürpriz bozan) içeriyor"
                    />

                    <button
                        type="submit"
                        disabled={mainForm.processing || !mainForm.data.content.trim()}
                        className="bg-[#00B074] hover:bg-[#009663] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-[#00B074]/20 flex items-center justify-center gap-2 cursor-pointer self-end sm:self-auto"
                    >
                        <Send className="w-3.5 h-3.5" />
                        <span>{mainForm.processing ? 'Gönderiliyor...' : 'Yorumu Gönder'}</span>
                    </button>
                </div>
            </form>

            {/* Comments List */}
            <div className="space-y-4">
                {comments.length === 0 ? (
                    <div className="bg-white dark:bg-[#0c0e14] p-10 rounded-2xl border border-slate-200 dark:border-white/10 text-center space-y-3">
                        <MessageSquare className="w-10 h-10 text-slate-300 dark:text-gray-600 mx-auto" />
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">Henüz Yorum Yapılmamış</h4>
                        <p className="text-xs text-slate-500 dark:text-gray-400 max-w-sm mx-auto">
                            Bu film için ilk yorumu yazan ve puan veren kişi siz olun!
                        </p>
                    </div>
                ) : (
                    comments.map((comment) => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                            currentUser={currentUser}
                            replyingToId={replyingToId}
                            setReplyingToId={setReplyingToId}
                            replyForm={replyForm}
                            replyGuestName={replyGuestName}
                            setReplyGuestName={setReplyGuestName}
                            handleReplySubmit={handleReplySubmit}
                            handleReaction={handleReaction}
                            handleDelete={handleDelete}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

function CommentItem({
    comment,
    currentUser,
    replyingToId,
    setReplyingToId,
    replyForm,
    replyGuestName,
    setReplyGuestName,
    handleReplySubmit,
    handleReaction,
    handleDelete,
    isReply = false,
}) {
    const isOwner = currentUser && (currentUser.id === comment.user_id || currentUser.is_admin);
    const [showSpoiler, setShowSpoiler] = useState(false);

    return (
        <div className={`bg-white dark:bg-[#0c0e14] p-5 sm:p-6 rounded-2xl border ${isReply ? 'border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-[#0F131C]' : 'border-slate-200 dark:border-white/10'
            } space-y-4 shadow-sm transition-all hover:border-slate-300 dark:hover:border-white/20`}>

            {/* Comment Author Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <img
                        src={comment.user_avatar}
                        alt={comment.user_name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-white/10 shrink-0"
                    />
                    <div>
                        <div className="flex items-center gap-2">
                            <h5 className="text-slate-900 dark:text-white font-bold text-sm">
                                {comment.user_name}
                            </h5>
                            {comment.user?.role === 'admin' && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-500/20 text-red-500 border border-red-500/30">
                                    YÖNETİCİ
                                </span>
                            )}
                            {comment.is_spoiler && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    SPOILER
                                </span>
                            )}
                        </div>
                        <p className="text-slate-400 dark:text-gray-500 text-xs">{comment.formatted_date}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {comment.rating && comment.rating > 0 && (
                        <div className="flex items-center gap-1.5 bg-amber-400/15 border border-amber-400/30 px-3 py-1 rounded-full text-amber-500 dark:text-amber-400 font-extrabold text-xs">
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                            <span>{comment.rating}/10</span>
                        </div>
                    )}

                    {isOwner && (
                        <button
                            type="button"
                            onClick={() => handleDelete(comment.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                            title="Yorumu Sil"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Comment Content (with Spoiler Shield support) */}
            {comment.is_spoiler && !showSpoiler ? (
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-600 dark:text-amber-400">
                    <div className="flex items-center gap-2.5 text-xs font-semibold">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                        <span>Bu yorum sürpriz bozan (spoiler) içeriyor.</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowSpoiler(true)}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
                    >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Spoiler'ı Göster</span>
                    </button>
                </div>
            ) : (
                <div className="space-y-2">
                    {comment.is_spoiler && showSpoiler && (
                        <div className="flex items-center justify-between text-[11px] text-amber-500 font-semibold bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">
                            <span className="flex items-center gap-1.5">
                                <AlertTriangle className="w-3 h-3" />
                                Spoiler Gösteriliyor
                            </span>
                            <button
                                type="button"
                                onClick={() => setShowSpoiler(false)}
                                className="hover:underline flex items-center gap-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                            >
                                <EyeOff className="w-3 h-3" />
                                Gizle
                            </button>
                        </div>
                    )}
                    <p className="text-slate-700 dark:text-gray-200 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                        {comment.content}
                    </p>
                </div>
            )}

            {/* Action Bar (Like, Dislike, Reply) */}
            <div className="flex items-center gap-5 text-xs text-slate-500 dark:text-gray-400 pt-1 border-t border-slate-100 dark:border-white/5">
                <button
                    type="button"
                    onClick={() => handleReaction(comment.id, 'like')}
                    className="flex items-center gap-1.5 hover:text-[#00B074] transition-colors cursor-pointer group"
                >
                    <ThumbsUp className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                    <span>Faydalı ({comment.likes_count || 0})</span>
                </button>

                <button
                    type="button"
                    onClick={() => handleReaction(comment.id, 'dislike')}
                    className="flex items-center gap-1.5 hover:text-red-500 transition-colors cursor-pointer group"
                >
                    <ThumbsDown className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                    <span>Faydasız ({comment.dislikes_count || 0})</span>
                </button>

                {!isReply && (
                    <button
                        type="button"
                        onClick={() => {
                            if (replyingToId === comment.id) {
                                setReplyingToId(null);
                            } else {
                                setReplyingToId(comment.id);
                                replyForm.setData('content', '');
                            }
                        }}
                        className={`flex items-center gap-1.5 font-semibold transition-colors cursor-pointer ml-auto ${replyingToId === comment.id
                            ? 'text-[#00B074]'
                            : 'hover:text-slate-900 dark:hover:text-white'
                            }`}
                    >
                        <Reply className="w-3.5 h-3.5" />
                        <span>Yanıtla</span>
                    </button>
                )}
            </div>

            {/* Inline Reply Form */}
            {replyingToId === comment.id && (
                <form
                    onSubmit={(e) => handleReplySubmit(e, comment.id)}
                    className="mt-4 p-4 rounded-xl bg-slate-100/70 dark:bg-[#0A0D14] border border-slate-200 dark:border-white/10 space-y-3 animate-fadeIn"
                >
                    <div className="flex items-center justify-between text-xs font-semibold text-[#00B074]">
                        <div className="flex items-center gap-1.5">
                            <CornerDownRight className="w-3.5 h-3.5" />
                            <span><strong>@{comment.user_name}</strong> kullanıcısına yanıt veriyorsunuz</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setReplyingToId(null)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {!currentUser && (
                        <input
                            type="text"
                            value={replyGuestName}
                            onChange={(e) => setReplyGuestName(e.target.value)}
                            placeholder="Adınız (İsteğe bağlı)"
                            className="w-full sm:w-64 bg-white dark:bg-[#0c0e14] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-[#00B074]"
                        />
                    )}

                    <textarea
                        value={replyForm.data.content}
                        onChange={(e) => replyForm.setData('content', e.target.value)}
                        placeholder="Yanıtınızı yazın..."
                        rows={2}
                        className="w-full bg-white dark:bg-[#0c0e14] border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-[#00B074] resize-y min-h-[70px]"
                    />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                        <SpoilerToggle
                            checked={replyForm.data.is_spoiler}
                            onChange={(val) => replyForm.setData('is_spoiler', val)}
                            label="Spoiler içeriyor"
                        />

                        <div className="flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setReplyingToId(null)}
                                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                            >
                                Vazgeç
                            </button>
                            <button
                                type="submit"
                                disabled={replyForm.processing || !replyForm.data.content.trim()}
                                className="px-4 py-2 bg-[#00B074] hover:bg-[#009663] disabled:opacity-50 text-white font-bold rounded-lg text-xs transition-all shadow-md shadow-[#00B074]/20 flex items-center gap-1.5"
                            >
                                <Send className="w-3 h-3" />
                                <span>Yanıtı Gönder</span>
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* Render Replies List */}
            {comment.replies && comment.replies.length > 0 && (
                <div className="pt-3 pl-3 sm:pl-6 border-l-2 border-[#00B074]/30 space-y-3 mt-4">
                    {comment.replies.map((reply) => (
                        <CommentItem
                            key={reply.id}
                            comment={reply}
                            currentUser={currentUser}
                            replyingToId={replyingToId}
                            setReplyingToId={setReplyingToId}
                            replyForm={replyForm}
                            replyGuestName={replyGuestName}
                            setReplyGuestName={setReplyGuestName}
                            handleReplySubmit={handleReplySubmit}
                            handleReaction={handleReaction}
                            handleDelete={handleDelete}
                            isReply={true}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
