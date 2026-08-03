-- SAP IM style: material documents replace inbound/outbound tables
-- Prefer running via: node --env-file=.env.local db/run-migrations.mjs

CREATE TABLE IF NOT EXISTS `sparepart_mat_docs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `doc_number` VARCHAR(32) NOT NULL,
  `movement_type` VARCHAR(8) NOT NULL,
  `posting_date` DATE NOT NULL,
  `header_text` VARCHAR(255) NULL,
  `recipient` VARCHAR(255) NULL,
  `created_by` VARCHAR(64) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sparepart_mat_docs_number` (`doc_number`),
  KEY `idx_sparepart_mat_docs_type` (`movement_type`),
  KEY `idx_sparepart_mat_docs_date` (`posting_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `sparepart_mat_doc_items` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `doc_id` INT NOT NULL,
  `item_id` INT NOT NULL,
  `line_no` INT NOT NULL,
  `qty` INT NOT NULL,
  `storage_location` VARCHAR(255) NULL,
  `note` VARCHAR(255) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sparepart_mat_doc_items_doc` (`doc_id`),
  KEY `idx_sparepart_mat_doc_items_item` (`item_id`),
  CONSTRAINT `fk_sparepart_mat_doc_items_doc`
    FOREIGN KEY (`doc_id`) REFERENCES `sparepart_mat_docs` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_sparepart_mat_doc_items_item`
    FOREIGN KEY (`item_id`) REFERENCES `sparepart_items` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
