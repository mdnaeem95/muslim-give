CREATE TABLE `device` (
	`id` text PRIMARY KEY NOT NULL,
	`install_id` text NOT NULL,
	`hlc_millis` integer DEFAULT 0 NOT NULL,
	`hlc_counter` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "device_singleton" CHECK("device"."id" = 'device')
);
--> statement-breakpoint
CREATE TABLE `notification_schedule` (
	`key` text PRIMARY KEY NOT NULL,
	`notification_id` text NOT NULL,
	`fire_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `official_dates_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`events` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `outbox` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`collection` text NOT NULL,
	`record_id` text NOT NULL,
	`op` text NOT NULL,
	`hlc` text NOT NULL,
	`payload` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` text,
	`last_error_code` text,
	CONSTRAINT "outbox_op" CHECK("outbox"."op" in ('upsert', 'delete')),
	CONSTRAINT "outbox_attempts" CHECK("outbox"."attempts" >= 0)
);
--> statement-breakpoint
CREATE INDEX `outbox_record_idx` ON `outbox` (`collection`,`record_id`);--> statement-breakpoint
CREATE INDEX `outbox_due_idx` ON `outbox` (`next_attempt_at`);--> statement-breakpoint
CREATE TABLE `ref_cache` (
	`list_id` text PRIMARY KEY NOT NULL,
	`version` integer NOT NULL,
	`items` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_state` (
	`collection` text PRIMARY KEY NOT NULL,
	`cursor` text,
	`last_success_at` text
);
--> statement-breakpoint
CREATE TABLE `budget` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`hlc` text NOT NULL,
	`deleted` integer DEFAULT 0 NOT NULL,
	`monthly_amount_minor` integer NOT NULL,
	`currency` text NOT NULL,
	CONSTRAINT "budget_singleton" CHECK("budget"."id" = 'budget'),
	CONSTRAINT "budget_deleted" CHECK("budget"."deleted" in (0, 1)),
	CONSTRAINT "budget_amount" CHECK("budget"."monthly_amount_minor" >= 0),
	CONSTRAINT "budget_currency" CHECK(length("budget"."currency") = 3 and "budget"."currency" = upper("budget"."currency"))
);
--> statement-breakpoint
CREATE TABLE `donations` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`hlc` text NOT NULL,
	`deleted` integer DEFAULT 0 NOT NULL,
	`date` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`country_code` text NOT NULL,
	`category` text NOT NULL,
	`recipient_name` text,
	`recipient_ref_id` text,
	`relationship` text,
	`relationship_side` text,
	`relationship_line` text,
	`occasion` text NOT NULL,
	`occasion_other` text,
	`giving_type` text NOT NULL,
	`on_behalf` text NOT NULL,
	`on_behalf_name` text,
	`note` text,
	`source` text NOT NULL,
	`recurring_rule_id` text,
	`occurrence_month` text,
	`eid_plan_id` text,
	`eid_person_id` text,
	`eid_packet_group` text,
	CONSTRAINT "donations_deleted" CHECK("donations"."deleted" in (0, 1)),
	CONSTRAINT "donations_date" CHECK("donations"."date" glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
	CONSTRAINT "donations_amount" CHECK("donations"."amount_minor" > 0),
	CONSTRAINT "donations_currency" CHECK(length("donations"."currency") = 3 and "donations"."currency" = upper("donations"."currency")),
	CONSTRAINT "donations_country" CHECK(length("donations"."country_code") = 2 and "donations"."country_code" = upper("donations"."country_code")),
	CONSTRAINT "donations_source" CHECK("donations"."source" in ('manual', 'recurring', 'eid_person', 'eid_packet', 'repeat_friday', 'reminder')),
	CONSTRAINT "donations_packet_group" CHECK(("donations"."eid_packet_group" is null or "donations"."eid_packet_group" in ('kids', 'elderly'))),
	CONSTRAINT "donations_occurrence_pair" CHECK(("donations"."recurring_rule_id" is null) = ("donations"."occurrence_month" is null)),
	CONSTRAINT "donations_category" CHECK("donations"."category" in ('individual', 'mosque', 'charity')),
	CONSTRAINT "donations_relationship" CHECK(("donations"."relationship" is null or "donations"."relationship" in ('father', 'mother', 'both_parents', 'spouse', 'kids', 'siblings', 'grandparents', 'uncle', 'aunt', 'cousins', 'nephew', 'niece', 'distant_relative', 'friends', 'stranger'))),
	CONSTRAINT "donations_side" CHECK(("donations"."relationship_side" is null or "donations"."relationship_side" in ('mine', 'spouse'))),
	CONSTRAINT "donations_line" CHECK(("donations"."relationship_line" is null or "donations"."relationship_line" in ('paternal', 'maternal'))),
	CONSTRAINT "donations_recipient_len" CHECK(("donations"."recipient_name" is null or length("donations"."recipient_name") <= 80)),
	CONSTRAINT "donations_recipient_rules" CHECK(("donations"."category" = 'individual' or ("donations"."recipient_name" is not null and length("donations"."recipient_name") > 0))
      and ("donations"."category" = 'individual' or ("donations"."relationship" is null and "donations"."relationship_side" is null and "donations"."relationship_line" is null))),
	CONSTRAINT "donations_occasion" CHECK("donations"."occasion" in ('newborn', 'cukur_rambut', 'visiting_sick', 'death_funeral', 'birthday', 'anniversary', 'wedding', 'umrah_haj_send_off', 'doa_selamat', 'doa_tahlil', 'friday_prayer', 'subuh', 'zohor', 'asar', 'maghrib', 'isyak', 'tarawih', 'eid_prayer', 'ramadan', 'laylatul_qadr', 'eid_al_fitr', 'day_of_arafah', 'eid_al_adha', 'awal_muharram', 'ashura', 'mawlid_nabi', 'isra_miraj', 'nisfu_syaban', 'none', 'appeal_emergency', 'other')),
	CONSTRAINT "donations_giving_type" CHECK("donations"."giving_type" in ('sadaqah', 'zakat_fitrah', 'zakat_harta', 'infaq', 'wakaf', 'fidyah', 'eid_money', 'hadiah', 'other')),
	CONSTRAINT "donations_on_behalf" CHECK("donations"."on_behalf" in ('self', 'late_father', 'late_mother', 'late_parents', 'other')),
	CONSTRAINT "donations_occasion_other_len" CHECK(("donations"."occasion_other" is null or length("donations"."occasion_other") <= 60)),
	CONSTRAINT "donations_on_behalf_name_len" CHECK(("donations"."on_behalf_name" is null or length("donations"."on_behalf_name") <= 60)),
	CONSTRAINT "donations_note_len" CHECK(("donations"."note" is null or length("donations"."note") <= 120)),
	CONSTRAINT "donations_occasion_other_rule" CHECK("donations"."occasion_other" is null or "donations"."occasion" = 'other'),
	CONSTRAINT "donations_on_behalf_name_rule" CHECK(("donations"."on_behalf" = 'other') = ("donations"."on_behalf_name" is not null))
);
--> statement-breakpoint
CREATE INDEX `donations_date_idx` ON `donations` (`deleted`,`date`);--> statement-breakpoint
CREATE INDEX `donations_currency_date_idx` ON `donations` (`deleted`,`currency`,`date`);--> statement-breakpoint
CREATE INDEX `donations_category_date_idx` ON `donations` (`deleted`,`category`,`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `donations_occurrence_uq` ON `donations` (`recurring_rule_id`,`occurrence_month`) WHERE "donations"."recurring_rule_id" is not null;--> statement-breakpoint
CREATE INDEX `donations_eid_packet_idx` ON `donations` (`eid_plan_id`,`eid_packet_group`);--> statement-breakpoint
CREATE TABLE `eid_packet_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`hlc` text NOT NULL,
	`deleted` integer DEFAULT 0 NOT NULL,
	`plan_id` text NOT NULL,
	`group_key` text NOT NULL,
	`count` integer NOT NULL,
	`amount_each_minor` integer NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `eid_plans`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "eid_packets_deleted" CHECK("eid_packet_groups"."deleted" in (0, 1)),
	CONSTRAINT "eid_packets_group" CHECK("eid_packet_groups"."group_key" in ('kids', 'elderly')),
	CONSTRAINT "eid_packets_count" CHECK("eid_packet_groups"."count" between 0 and 999),
	CONSTRAINT "eid_packets_amount" CHECK("eid_packet_groups"."amount_each_minor" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `eid_packets_plan_group_uq` ON `eid_packet_groups` (`plan_id`,`group_key`);--> statement-breakpoint
CREATE TABLE `eid_people` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`hlc` text NOT NULL,
	`deleted` integer DEFAULT 0 NOT NULL,
	`plan_id` text NOT NULL,
	`name` text NOT NULL,
	`relationship` text NOT NULL,
	`relationship_side` text,
	`relationship_line` text,
	`group` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`donation_id` text,
	FOREIGN KEY (`plan_id`) REFERENCES `eid_plans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`donation_id`) REFERENCES `donations`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "eid_people_deleted" CHECK("eid_people"."deleted" in (0, 1)),
	CONSTRAINT "eid_people_name" CHECK(length("eid_people"."name") between 1 and 40),
	CONSTRAINT "eid_people_relationship" CHECK("eid_people"."relationship" in ('father', 'mother', 'both_parents', 'spouse', 'kids', 'siblings', 'grandparents', 'uncle', 'aunt', 'cousins', 'nephew', 'niece', 'distant_relative', 'friends', 'stranger') and "eid_people"."relationship" <> 'stranger'),
	CONSTRAINT "eid_people_side" CHECK(("eid_people"."relationship_side" is null or "eid_people"."relationship_side" in ('mine', 'spouse'))),
	CONSTRAINT "eid_people_line" CHECK(("eid_people"."relationship_line" is null or "eid_people"."relationship_line" in ('paternal', 'maternal'))),
	CONSTRAINT "eid_people_group" CHECK("eid_people"."group" in ('kids', 'families', 'others')),
	CONSTRAINT "eid_people_amount" CHECK("eid_people"."amount_minor" > 0)
);
--> statement-breakpoint
CREATE INDEX `eid_people_plan_idx` ON `eid_people` (`plan_id`,`deleted`);--> statement-breakpoint
CREATE TABLE `eid_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`hlc` text NOT NULL,
	`deleted` integer DEFAULT 0 NOT NULL,
	`year` integer NOT NULL,
	`budget_minor` integer NOT NULL,
	`currency` text NOT NULL,
	CONSTRAINT "eid_plans_deleted" CHECK("eid_plans"."deleted" in (0, 1)),
	CONSTRAINT "eid_plans_year" CHECK("eid_plans"."year" between 1900 and 9999),
	CONSTRAINT "eid_plans_budget" CHECK("eid_plans"."budget_minor" >= 0),
	CONSTRAINT "eid_plans_currency" CHECK(length("eid_plans"."currency") = 3 and "eid_plans"."currency" = upper("eid_plans"."currency"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `eid_plans_year_uq` ON `eid_plans` (`year`);--> statement-breakpoint
CREATE TABLE `profile` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`hlc` text NOT NULL,
	`deleted` integer DEFAULT 0 NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`marital_status` text,
	`home_country_code` text NOT NULL,
	`home_currency` text NOT NULL,
	`hijri_adjust` integer DEFAULT 0 NOT NULL,
	`friday_reminder` integer DEFAULT 0 NOT NULL,
	`friday_dismissed_date` text,
	`welcome_seen` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "profile_singleton" CHECK("profile"."id" = 'profile'),
	CONSTRAINT "profile_deleted" CHECK("profile"."deleted" in (0, 1)),
	CONSTRAINT "profile_name" CHECK(length("profile"."name") <= 30),
	CONSTRAINT "profile_marital" CHECK(("profile"."marital_status" is null or "profile"."marital_status" in ('single', 'married'))),
	CONSTRAINT "profile_country" CHECK(length("profile"."home_country_code") = 2 and "profile"."home_country_code" = upper("profile"."home_country_code")),
	CONSTRAINT "profile_currency" CHECK(length("profile"."home_currency") = 3 and "profile"."home_currency" = upper("profile"."home_currency")),
	CONSTRAINT "profile_hijri" CHECK("profile"."hijri_adjust" in (-1, 0, 1)),
	CONSTRAINT "profile_friday" CHECK("profile"."friday_reminder" in (0, 1)),
	CONSTRAINT "profile_friday_dismissed" CHECK(("profile"."friday_dismissed_date" is null or "profile"."friday_dismissed_date" glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')),
	CONSTRAINT "profile_welcome" CHECK("profile"."welcome_seen" in (0, 1))
);
--> statement-breakpoint
CREATE TABLE `prompt_state` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`hlc` text NOT NULL,
	`deleted` integer DEFAULT 0 NOT NULL,
	`times_asked` integer DEFAULT 0 NOT NULL,
	`last_asked_at` text,
	CONSTRAINT "prompt_singleton" CHECK("prompt_state"."id" = 'prompt_state'),
	CONSTRAINT "prompt_deleted" CHECK("prompt_state"."deleted" in (0, 1)),
	CONSTRAINT "prompt_times" CHECK("prompt_state"."times_asked" between 0 and 2)
);
--> statement-breakpoint
CREATE TABLE `receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`hlc` text NOT NULL,
	`deleted` integer DEFAULT 0 NOT NULL,
	`donation_id` text NOT NULL,
	`file_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`sha256` text NOT NULL,
	`width` integer,
	`height` integer,
	`local_path` text,
	`upload_state` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error_code` text,
	FOREIGN KEY (`donation_id`) REFERENCES `donations`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "receipts_deleted" CHECK("receipts"."deleted" in (0, 1)),
	CONSTRAINT "receipts_file_name" CHECK(length("receipts"."file_name") between 1 and 100),
	CONSTRAINT "receipts_size" CHECK("receipts"."size_bytes" between 1 and 10485760),
	CONSTRAINT "receipts_sha256" CHECK(length("receipts"."sha256") = 64),
	CONSTRAINT "receipts_upload_state" CHECK("receipts"."upload_state" in ('pending', 'uploading', 'uploaded', 'failed'))
);
--> statement-breakpoint
CREATE INDEX `receipts_donation_idx` ON `receipts` (`donation_id`);--> statement-breakpoint
CREATE TABLE `recurring_occurrences` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`hlc` text NOT NULL,
	`deleted` integer DEFAULT 0 NOT NULL,
	`rule_id` text NOT NULL,
	`month` text NOT NULL,
	`due_date` text NOT NULL,
	`status` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`donation_id` text,
	FOREIGN KEY (`rule_id`) REFERENCES `recurring_rules`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`donation_id`) REFERENCES `donations`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "occurrences_deleted" CHECK("recurring_occurrences"."deleted" in (0, 1)),
	CONSTRAINT "occurrences_month" CHECK("recurring_occurrences"."month" glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]'),
	CONSTRAINT "occurrences_due_date" CHECK("recurring_occurrences"."due_date" glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
	CONSTRAINT "occurrences_status" CHECK("recurring_occurrences"."status" in ('pending', 'logged', 'declined', 'skipped')),
	CONSTRAINT "occurrences_amount" CHECK("recurring_occurrences"."amount_minor" > 0),
	CONSTRAINT "occurrences_currency" CHECK(length("recurring_occurrences"."currency") = 3 and "recurring_occurrences"."currency" = upper("recurring_occurrences"."currency"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `occurrences_rule_month_uq` ON `recurring_occurrences` (`rule_id`,`month`);--> statement-breakpoint
CREATE INDEX `occurrences_status_idx` ON `recurring_occurrences` (`deleted`,`status`,`due_date`);--> statement-breakpoint
CREATE TABLE `recurring_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`hlc` text NOT NULL,
	`deleted` integer DEFAULT 0 NOT NULL,
	`category` text NOT NULL,
	`recipient_name` text,
	`recipient_ref_id` text,
	`relationship` text,
	`relationship_side` text,
	`relationship_line` text,
	`occasion` text NOT NULL,
	`occasion_other` text,
	`giving_type` text NOT NULL,
	`on_behalf` text NOT NULL,
	`on_behalf_name` text,
	`note` text,
	`amount_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`country_code` text NOT NULL,
	`day_of_month` integer NOT NULL,
	`start_month` text NOT NULL,
	`mode` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`resume_from_month` text,
	`backfill_decided` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rules_deleted" CHECK("recurring_rules"."deleted" in (0, 1)),
	CONSTRAINT "rules_amount" CHECK("recurring_rules"."amount_minor" > 0),
	CONSTRAINT "rules_currency" CHECK(length("recurring_rules"."currency") = 3 and "recurring_rules"."currency" = upper("recurring_rules"."currency")),
	CONSTRAINT "rules_country" CHECK(length("recurring_rules"."country_code") = 2 and "recurring_rules"."country_code" = upper("recurring_rules"."country_code")),
	CONSTRAINT "rules_day" CHECK("recurring_rules"."day_of_month" between 1 and 31),
	CONSTRAINT "rules_start_month" CHECK("recurring_rules"."start_month" glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]'),
	CONSTRAINT "rules_resume_month" CHECK("recurring_rules"."resume_from_month" is null or "recurring_rules"."resume_from_month" glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]'),
	CONSTRAINT "rules_mode" CHECK("recurring_rules"."mode" in ('auto', 'confirm')),
	CONSTRAINT "rules_status" CHECK("recurring_rules"."status" in ('active', 'paused', 'stopped')),
	CONSTRAINT "rules_backfill" CHECK("recurring_rules"."backfill_decided" in (0, 1)),
	CONSTRAINT "rules_no_friday" CHECK("recurring_rules"."occasion" <> 'friday_prayer'),
	CONSTRAINT "rules_category" CHECK("recurring_rules"."category" in ('individual', 'mosque', 'charity')),
	CONSTRAINT "rules_relationship" CHECK(("recurring_rules"."relationship" is null or "recurring_rules"."relationship" in ('father', 'mother', 'both_parents', 'spouse', 'kids', 'siblings', 'grandparents', 'uncle', 'aunt', 'cousins', 'nephew', 'niece', 'distant_relative', 'friends', 'stranger'))),
	CONSTRAINT "rules_side" CHECK(("recurring_rules"."relationship_side" is null or "recurring_rules"."relationship_side" in ('mine', 'spouse'))),
	CONSTRAINT "rules_line" CHECK(("recurring_rules"."relationship_line" is null or "recurring_rules"."relationship_line" in ('paternal', 'maternal'))),
	CONSTRAINT "rules_recipient_len" CHECK(("recurring_rules"."recipient_name" is null or length("recurring_rules"."recipient_name") <= 80)),
	CONSTRAINT "rules_recipient_rules" CHECK(("recurring_rules"."category" = 'individual' or ("recurring_rules"."recipient_name" is not null and length("recurring_rules"."recipient_name") > 0))
      and ("recurring_rules"."category" = 'individual' or ("recurring_rules"."relationship" is null and "recurring_rules"."relationship_side" is null and "recurring_rules"."relationship_line" is null))),
	CONSTRAINT "rules_occasion" CHECK("recurring_rules"."occasion" in ('newborn', 'cukur_rambut', 'visiting_sick', 'death_funeral', 'birthday', 'anniversary', 'wedding', 'umrah_haj_send_off', 'doa_selamat', 'doa_tahlil', 'friday_prayer', 'subuh', 'zohor', 'asar', 'maghrib', 'isyak', 'tarawih', 'eid_prayer', 'ramadan', 'laylatul_qadr', 'eid_al_fitr', 'day_of_arafah', 'eid_al_adha', 'awal_muharram', 'ashura', 'mawlid_nabi', 'isra_miraj', 'nisfu_syaban', 'none', 'appeal_emergency', 'other')),
	CONSTRAINT "rules_giving_type" CHECK("recurring_rules"."giving_type" in ('sadaqah', 'zakat_fitrah', 'zakat_harta', 'infaq', 'wakaf', 'fidyah', 'eid_money', 'hadiah', 'other')),
	CONSTRAINT "rules_on_behalf" CHECK("recurring_rules"."on_behalf" in ('self', 'late_father', 'late_mother', 'late_parents', 'other')),
	CONSTRAINT "rules_occasion_other_len" CHECK(("recurring_rules"."occasion_other" is null or length("recurring_rules"."occasion_other") <= 60)),
	CONSTRAINT "rules_on_behalf_name_len" CHECK(("recurring_rules"."on_behalf_name" is null or length("recurring_rules"."on_behalf_name") <= 60)),
	CONSTRAINT "rules_note_len" CHECK(("recurring_rules"."note" is null or length("recurring_rules"."note") <= 120)),
	CONSTRAINT "rules_occasion_other_rule" CHECK("recurring_rules"."occasion_other" is null or "recurring_rules"."occasion" = 'other'),
	CONSTRAINT "rules_on_behalf_name_rule" CHECK(("recurring_rules"."on_behalf" = 'other') = ("recurring_rules"."on_behalf_name" is not null))
);
--> statement-breakpoint
CREATE INDEX `rules_status_idx` ON `recurring_rules` (`deleted`,`status`);--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`hlc` text NOT NULL,
	`deleted` integer DEFAULT 0 NOT NULL,
	`label` text NOT NULL,
	`month_day` text NOT NULL,
	`occasion` text NOT NULL,
	`category` text NOT NULL,
	`recipient_name` text,
	`recipient_ref_id` text,
	`relationship` text,
	`relationship_side` text,
	`relationship_line` text,
	`last_amount_minor` integer,
	`last_currency` text,
	`last_date` text,
	`source_donation_id` text,
	CONSTRAINT "reminders_deleted" CHECK("reminders"."deleted" in (0, 1)),
	CONSTRAINT "reminders_label" CHECK(length("reminders"."label") between 1 and 40),
	CONSTRAINT "reminders_month_day" CHECK("reminders"."month_day" glob '[0-1][0-9]-[0-3][0-9]'),
	CONSTRAINT "reminders_occasion" CHECK("reminders"."occasion" in ('newborn', 'cukur_rambut', 'visiting_sick', 'death_funeral', 'birthday', 'anniversary', 'wedding', 'umrah_haj_send_off', 'doa_selamat', 'doa_tahlil', 'friday_prayer', 'subuh', 'zohor', 'asar', 'maghrib', 'isyak', 'tarawih', 'eid_prayer', 'ramadan', 'laylatul_qadr', 'eid_al_fitr', 'day_of_arafah', 'eid_al_adha', 'awal_muharram', 'ashura', 'mawlid_nabi', 'isra_miraj', 'nisfu_syaban', 'none', 'appeal_emergency', 'other')),
	CONSTRAINT "reminders_last_amount" CHECK("reminders"."last_amount_minor" is null or "reminders"."last_amount_minor" > 0),
	CONSTRAINT "reminders_last_currency" CHECK("reminders"."last_currency" is null or length("reminders"."last_currency") = 3 and "reminders"."last_currency" = upper("reminders"."last_currency")),
	CONSTRAINT "reminders_last_date" CHECK(("reminders"."last_date" is null or "reminders"."last_date" glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')),
	CONSTRAINT "reminders_category" CHECK("reminders"."category" in ('individual', 'mosque', 'charity')),
	CONSTRAINT "reminders_relationship" CHECK(("reminders"."relationship" is null or "reminders"."relationship" in ('father', 'mother', 'both_parents', 'spouse', 'kids', 'siblings', 'grandparents', 'uncle', 'aunt', 'cousins', 'nephew', 'niece', 'distant_relative', 'friends', 'stranger'))),
	CONSTRAINT "reminders_side" CHECK(("reminders"."relationship_side" is null or "reminders"."relationship_side" in ('mine', 'spouse'))),
	CONSTRAINT "reminders_line" CHECK(("reminders"."relationship_line" is null or "reminders"."relationship_line" in ('paternal', 'maternal'))),
	CONSTRAINT "reminders_recipient_len" CHECK(("reminders"."recipient_name" is null or length("reminders"."recipient_name") <= 80)),
	CONSTRAINT "reminders_recipient_rules" CHECK(("reminders"."category" = 'individual' or ("reminders"."recipient_name" is not null and length("reminders"."recipient_name") > 0))
      and ("reminders"."category" = 'individual' or ("reminders"."relationship" is null and "reminders"."relationship_side" is null and "reminders"."relationship_line" is null)))
);
--> statement-breakpoint
CREATE INDEX `reminders_month_day_idx` ON `reminders` (`deleted`,`month_day`);