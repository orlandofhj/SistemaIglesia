package com.iglesiadelacalle.sistemaiglesia.controllers;

import java.util.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.iglesiadelacalle.sistemaiglesia.models.*;
import com.iglesiadelacalle.sistemaiglesia.repository.*;

@RestController
@RequestMapping("/api/teologia")
@CrossOrigin(origins = "*")
public class TeologiaController {

    @Autowired private TeologiaRepository teologiaRepo;
    @Autowired private TemaRepository temaRepo;

    @GetMapping("/todos")
    public ResponseEntity<?> obtenerTodos() {
        try {
            List<Teologia> lista = teologiaRepo.findAll();
            lista.sort((a, b) -> b.getIdTeologia().compareTo(a.getIdTeologia()));
            return ResponseEntity.ok(lista);
        } catch (Exception e) { 
            return ResponseEntity.badRequest().body(e.getMessage()); 
        }
    }

    @PostMapping("/crear")
    @SuppressWarnings("unchecked")
    public ResponseEntity<?> crear(@RequestBody Map<String, Object> payload) {
        try {
            String denominacion = ((String) payload.get("denominacion")).trim();
            String descripcion = ((String) payload.get("descripcion")).trim();

            // 🛡️ VALIDACIÓN 1: Que la clase no exista
            if (teologiaRepo.existsByDenominacionIgnoreCase(denominacion)) {
                return ResponseEntity.badRequest().body("El nombre de esta unidad teológica ya existe.");
            }

            List<Map<String, String>> temasData = (List<Map<String, String>>) payload.get("temas");
            if (temasData == null || temasData.size() < 5) {
                return ResponseEntity.badRequest().body("La unidad de teología debe tener un mínimo de 5 temas.");
            }

            // 🛡️ VALIDACIONES DE TEMAS (Creación)
            Set<String> temasUnicos = new HashSet<>();
            for (Map<String, String> t : temasData) {
                String nombreTema = t.get("denominacion").trim();
                String nombreNormalizado = nombreTema.toLowerCase();

                // Validar que no se repita en el mismo formulario
                if (!temasUnicos.add(nombreNormalizado)) {
                    return ResponseEntity.badRequest().body("El tema '" + nombreTema + "' está repetido en el formulario.");
                }

                // Validar que no exista en otra clase de la Base de Datos
                if (temaRepo.existsByDenominacionIgnoreCase(nombreTema)) {
                    return ResponseEntity.badRequest().body("El tema '" + nombreTema + "' ya existe en otra clase registrada.");
                }
            }

            Teologia teo = new Teologia();
            teo.setDenominacion(denominacion);
            teo.setDescripcion(descripcion);
            teo.setEstado("Activo");
            teo = teologiaRepo.save(teo);

            for (Map<String, String> t : temasData) {
                Tema tema = new Tema();
                tema.setDenominacion(t.get("denominacion").trim());
                tema.setTeologia(teo);
                temaRepo.save(tema);
            }
            return ResponseEntity.ok("Unidad de Teología creada exitosamente con " + temasData.size() + " temas.");
        } catch (Exception e) { 
            return ResponseEntity.badRequest().body(e.getMessage()); 
        }
    }

    @PutMapping("/modificar/{id}")
    @SuppressWarnings("unchecked")
    public ResponseEntity<?> modificar(@PathVariable Integer id, @RequestBody Map<String, Object> payload) {
        try {
            Teologia teo = teologiaRepo.findById(id).orElseThrow();
            String denominacion = ((String) payload.get("denominacion")).trim();
            String descripcion = ((String) payload.get("descripcion")).trim();

            // 🛡️ VALIDACIÓN 1: Que el nuevo nombre no le pertenezca a otra clase
            if (teologiaRepo.existsByDenominacionIgnoreCaseAndIdTeologiaNot(denominacion, id)) {
                return ResponseEntity.badRequest().body("El nombre de esta unidad teológica ya existe en otro registro.");
            }

            List<Map<String, String>> temasData = (List<Map<String, String>>) payload.get("temas");
            if (temasData == null || temasData.size() < 5) {
                return ResponseEntity.badRequest().body("La unidad de teología debe tener un mínimo de 5 temas.");
            }

            // 🛡️ VALIDACIONES DE TEMAS (Modificación)
            Set<String> temasUnicos = new HashSet<>();
            for (Map<String, String> t : temasData) {
                String nombreTema = t.get("denominacion").trim();
                String nombreNormalizado = nombreTema.toLowerCase();

                // Validar que no se repita en el mismo formulario
                if (!temasUnicos.add(nombreNormalizado)) {
                    return ResponseEntity.badRequest().body("El tema '" + nombreTema + "' está repetido en el formulario.");
                }

                // Validar que no exista en OTRA unidad teológica diferente a la actual
                if (temaRepo.existsByDenominacionIgnoreCaseAndTeologia_IdTeologiaNot(nombreTema, id)) {
                    return ResponseEntity.badRequest().body("El tema '" + nombreTema + "' ya pertenece a OTRA unidad teológica diferente.");
                }
            }

            temaRepo.deleteAll(teo.getTemas());
            teo.getTemas().clear();

            for (Map<String, String> t : temasData) {
                Tema tema = new Tema();
                tema.setDenominacion(t.get("denominacion").trim());
                tema.setTeologia(teo);
                teo.getTemas().add(tema);
            }

            teo.setDenominacion(denominacion);
            teo.setDescripcion(descripcion);
            teologiaRepo.save(teo);

            return ResponseEntity.ok("Unidad de Teología modificada exitosamente.");
        } catch (Exception e) { 
            return ResponseEntity.badRequest().body(e.getMessage()); 
        }
    }

    @PatchMapping("/{id}/estado")
    public ResponseEntity<?> cambiarEstado(@PathVariable Integer id, @RequestBody Map<String, String> payload) {
        try {
            Teologia teo = teologiaRepo.findById(id).orElseThrow();
            teo.setEstado(payload.get("estado"));
            teologiaRepo.save(teo);
            return ResponseEntity.ok("Estado actualizado");
        } catch (Exception e) { 
            return ResponseEntity.badRequest().body(e.getMessage()); 
        }
    }
}