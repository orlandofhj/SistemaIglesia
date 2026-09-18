package com.iglesiadelacalle.sistemaiglesia.controllers;

import java.util.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.iglesiadelacalle.sistemaiglesia.models.*;
import com.iglesiadelacalle.sistemaiglesia.repository.*;

@RestController
@RequestMapping("/api/bloques")
@CrossOrigin(origins = "*")
public class BloqueController {

    @Autowired private BloqueRepository bloqueRepo;
    @Autowired private TipRepository tipRepo;

    @GetMapping("/todos")
    public ResponseEntity<?> obtenerTodos() {
        try {
            List<Bloque> bloques = bloqueRepo.findAll();
            bloques.sort((b1, b2) -> b2.getIdBloque().compareTo(b1.getIdBloque()));
            return ResponseEntity.ok(bloques);
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    @PostMapping("/crear")
    @SuppressWarnings("unchecked")
    public ResponseEntity<?> crear(@RequestBody Map<String, Object> payload) {
        try {
            String denominacion = ((String) payload.get("denominacion")).trim();
            if (bloqueRepo.existsByDenominacionIgnoreCase(denominacion)) {
                return ResponseEntity.badRequest().body("El nombre del bloque ya existe.");
            }

            List<Map<String, String>> tipsData = (List<Map<String, String>>) payload.get("tips");
            
            // ⚡ VALIDACIÓN: Exactamente 4 tips
            if (tipsData == null || tipsData.size() != 4) {
                return ResponseEntity.badRequest().body("Un bloque debe tener exactamente 4 tips obligatorios.");
            }

            for (Map<String, String> t : tipsData) {
                if (tipRepo.existsByTituloIgnoreCase(t.get("titulo").trim())) {
                    return ResponseEntity.badRequest().body("El tip '" + t.get("titulo") + "' ya existe en el sistema.");
                }
            }

            // Crear el bloque puro (sin instructor)
            Bloque b = new Bloque();
            b.setDenominacion(denominacion);
            b.setEstado("Activo");
            b = bloqueRepo.save(b);

            for (Map<String, String> t : tipsData) {
                Tip tip = new Tip();
                tip.setTitulo(t.get("titulo").trim());
                tip.setDescripcion(t.get("descripcion").trim());
                tip.setBloque(b);
                tipRepo.save(tip);
            }
            return ResponseEntity.ok("Bloque creado exitosamente con 4 tips.");
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    @PutMapping("/modificar/{id}")
    @SuppressWarnings("unchecked")
    public ResponseEntity<?> modificar(@PathVariable Integer id, @RequestBody Map<String, Object> payload) {
        try {
            Bloque b = bloqueRepo.findById(id).orElseThrow();
            String denominacion = ((String) payload.get("denominacion")).trim();
            
            if (bloqueRepo.existsByDenominacionIgnoreCaseAndIdBloqueNot(denominacion, id)) {
                return ResponseEntity.badRequest().body("El nombre del bloque ya existe.");
            }

            List<Map<String, String>> tipsData = (List<Map<String, String>>) payload.get("tips");
            
            // ⚡ VALIDACIÓN: Exactamente 4 tips
            if (tipsData == null || tipsData.size() != 4) {
                return ResponseEntity.badRequest().body("Un bloque debe tener exactamente 4 tips obligatorios.");
            }

            // Eliminar tips antiguos
            tipRepo.deleteAll(b.getTips());
            b.getTips().clear();

            for (Map<String, String> t : tipsData) {
                if (tipRepo.existsByTituloIgnoreCase(t.get("titulo").trim())) {
                    return ResponseEntity.badRequest().body("El tip '" + t.get("titulo") + "' ya existe en el sistema.");
                }
                Tip tip = new Tip();
                tip.setTitulo(t.get("titulo").trim());
                tip.setDescripcion(t.get("descripcion").trim());
                tip.setBloque(b);
                b.getTips().add(tip);
            }

            // Actualizar nombre (sin instructor)
            b.setDenominacion(denominacion);
            bloqueRepo.save(b);

            return ResponseEntity.ok("Bloque modificado exitosamente con 4 tips.");
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    @PatchMapping("/{id}/estado")
    public ResponseEntity<?> cambiarEstado(@PathVariable Integer id, @RequestBody Map<String, String> payload) {
        try {
            Bloque b = bloqueRepo.findById(id).orElseThrow();
            b.setEstado(payload.get("estado"));
            bloqueRepo.save(b);
            return ResponseEntity.ok("Estado actualizado");
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }
}