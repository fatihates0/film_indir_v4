<?php

namespace App\Http\Controllers;

use App\Models\Comment;
use App\Models\CommentReaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CommentController extends Controller
{
    /**
     * Store a newly created comment/review.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'tmdb_title_id' => 'required|exists:tmdb_titles,id',
            'parent_id' => 'nullable|exists:comments,id',
            'rating' => 'nullable|integer|min:1|max:10',
            'content' => 'required|string|min:3|max:2500',
            'guest_name' => 'nullable|string|max:50',
            'is_spoiler' => 'nullable|boolean',
        ], [
            'content.required' => 'Lütfen bir yorum yazın.',
            'content.min' => 'Yorumunuz en az 3 karakter olmalıdır.',
            'content.max' => 'Yorumunuz en fazla 2500 karakter olabilir.',
            'rating.min' => 'Puan 1 ile 10 arasında olmalıdır.',
            'rating.max' => 'Puan 1 ile 10 arasında olmalıdır.',
        ]);

        $user = Auth::user();

        if ($validated['parent_id'] ?? null) {
            $parent = Comment::find($validated['parent_id']);
            if ($parent && $parent->tmdb_title_id != $validated['tmdb_title_id']) {
                return back()->withErrors(['parent_id' => 'Geçersiz yanıt hedefi.']);
            }
        }

        $comment = Comment::create([
            'tmdb_title_id' => $validated['tmdb_title_id'],
            'user_id' => $user ? $user->id : null,
            'parent_id' => $validated['parent_id'] ?? null,
            'guest_name' => $user ? null : ($validated['guest_name'] ?? 'Sinemasever'),
            'rating' => $validated['parent_id'] ? null : ($validated['rating'] ?? null),
            'content' => trim($validated['content']),
            'is_spoiler' => (bool) ($validated['is_spoiler'] ?? false),
            'is_approved' => true,
        ]);

        return back()->with('success', 'Yorumunuz başarıyla yayınlandı.');
    }

    /**
     * React (like/dislike) to a comment.
     */
    public function react(Request $request, Comment $comment)
    {
        $validated = $request->validate([
            'type' => 'required|in:like,dislike',
        ]);

        $user = Auth::user();
        $ip = $request->ip();
        $type = $validated['type'];

        $query = CommentReaction::where('comment_id', $comment->id);
        if ($user) {
            $query->where('user_id', $user->id);
        } else {
            $query->where('ip_address', $ip)->whereNull('user_id');
        }

        $existing = $query->first();

        if ($existing) {
            if ($existing->type === $type) {
                // Toggle off existing reaction
                $existing->delete();
                if ($type === 'like') {
                    $comment->decrement('likes_count');
                } else {
                    $comment->decrement('dislikes_count');
                }
            } else {
                // Switch reaction type
                $oldType = $existing->type;
                $existing->update(['type' => $type]);
                if ($oldType === 'like') {
                    $comment->decrement('likes_count');
                    $comment->increment('dislikes_count');
                } else {
                    $comment->decrement('dislikes_count');
                    $comment->increment('likes_count');
                }
            }
        } else {
            // Create new reaction
            CommentReaction::create([
                'comment_id' => $comment->id,
                'user_id' => $user ? $user->id : null,
                'ip_address' => $user ? null : $ip,
                'type' => $type,
            ]);

            if ($type === 'like') {
                $comment->increment('likes_count');
            } else {
                $comment->increment('dislikes_count');
            }
        }

        return back();
    }

    /**
     * Delete a comment (Author or Admin).
     */
    public function destroy(Request $request, Comment $comment)
    {
        $user = Auth::user();

        if (! $user) {
            abort(403, 'Bu işlem için giriş yapmalısınız.');
        }

        if (! $user->isAdmin() && $user->id !== $comment->user_id) {
            abort(403, 'Bu yorumu silme yetkiniz yok.');
        }

        $comment->delete();

        return back()->with('success', 'Yorum silindi.');
    }
}
