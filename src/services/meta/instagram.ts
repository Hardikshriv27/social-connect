import type { MetaInstagramAccount } from "./facebook";

export function getInstagramProfileName(
  account: MetaInstagramAccount,
) {
  return (
    account.username ||
    account.name ||
    "Instagram account"
  );
}