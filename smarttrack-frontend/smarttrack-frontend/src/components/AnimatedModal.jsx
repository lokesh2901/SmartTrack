import React from "react";
import { Modal, Button } from "react-bootstrap";
import { motion } from "framer-motion";

const AnimatedModal = ({ show, onHide, title, children, onConfirm }) => {
  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      backdrop="static"
      keyboard={false}
      dialogClassName="rounded-4"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <Modal.Header closeButton className="bg-primary text-white rounded-top-4">
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{children}</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Cancel
          </Button>
          {onConfirm && (
            <Button variant="primary" onClick={onConfirm}>
              Confirm
            </Button>
          )}
        </Modal.Footer>
      </motion.div>
    </Modal>
  );
};

export default AnimatedModal;
