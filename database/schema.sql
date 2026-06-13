CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER NOT NULL PRIMARY KEY,
  kind VARCHAR(12) NOT NULL,
  description VARCHAR(140) NOT NULL,
  category VARCHAR(80) NOT NULL,
  amount_cents INTEGER NOT NULL,
  occurred_on DATE NOT NULL,
  notes VARCHAR(280),
  created_at DATETIME NOT NULL,
  CONSTRAINT check_transaction_kind CHECK (kind in ('income', 'expense')),
  CONSTRAINT check_positive_amount CHECK (amount_cents > 0)
);

CREATE INDEX IF NOT EXISTS ix_transactions_kind ON transactions (kind);
CREATE INDEX IF NOT EXISTS ix_transactions_category ON transactions (category);
CREATE INDEX IF NOT EXISTS ix_transactions_occurred_on ON transactions (occurred_on);

CREATE TABLE IF NOT EXISTS budgets (
  id INTEGER NOT NULL PRIMARY KEY,
  category VARCHAR(80) NOT NULL UNIQUE,
  monthly_limit_cents INTEGER NOT NULL,
  created_at DATETIME NOT NULL,
  CONSTRAINT check_positive_monthly_limit CHECK (monthly_limit_cents > 0)
);
