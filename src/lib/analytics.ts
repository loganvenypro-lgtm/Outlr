import posthog from "posthog-js";

// Ties events to the logged-in account, so two accounts on one browser don't merge
export function identifyCurrentUser() {
  fetch("/api/auth/me")
    .then((res) => res.json())
    .then(({ authenticated, user }) => {
      if (!authenticated || !user?.id) return;
      const id = String(user.id);
      if (posthog.get_property("$user_state") === "identified" && posthog.get_distinct_id() !== id) posthog.reset();
      posthog.identify(id, { email: user.email, name: user.name, plan: user.plan });
    })
    .catch(() => {});
}
