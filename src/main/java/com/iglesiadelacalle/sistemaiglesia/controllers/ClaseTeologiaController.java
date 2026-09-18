package com.iglesiadelacalle.sistemaiglesia.controllers;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.*;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.iglesiadelacalle.sistemaiglesia.dto.ClaseTeologiaRequestDTO;
import com.iglesiadelacalle.sistemaiglesia.models.*;
import com.iglesiadelacalle.sistemaiglesia.repository.*;

@RestController
@RequestMapping("/api/clases-teologia")
@CrossOrigin(origins = "*")
public class ClaseTeologiaController {

    @Autowired private ClaseTeologiaRepository claseRepo;
    @Autowired private TeologiaRepository teologiaRepo;
    @Autowired private PersonaRepository personaRepo;
    @Autowired private TemaRepository temaRepo;
    @Autowired private NotaTeologiaRepository notaRepo;
    @Autowired private PlanificacionRepository planRepo;

    @GetMapping("/todos")
    public ResponseEntity<?> obtenerTodas() {
        try {
            List<ClaseTeologia> clases = claseRepo.findAll();
            clases.sort((c1, c2) -> c2.getIdClaseTeologia().compareTo(c1.getIdClaseTeologia()));
            return ResponseEntity.ok(clases);
        } catch (Exception e) { return ResponseEntity.badRequest().body("Error al cargar las clases."); }
    }

    @PostMapping("/crear")
    public ResponseEntity<?> crearClase(@RequestBody ClaseTeologiaRequestDTO request) {
        try {
            if (request.getFechaInicio() == null || request.getFechaFin() == null) {
                return ResponseEntity.badRequest().body("Las fechas de inicio y fin son obligatorias.");
            }

            int anioActual = ZonedDateTime.now(ZoneId.of("America/Caracas")).getYear();
            if (claseRepo.existsByTeologia_IdTeologiaAndTema_IdTemaAndAnio(request.getIdTeologia(), request.getIdTema(), anioActual)) {
                return ResponseEntity.badRequest().body("Ya existe una clase para esta unidad curricular en el año " + anioActual);
            }

            Teologia teo = teologiaRepo.findById(request.getIdTeologia()).orElseThrow(() -> new Exception("Unidad de Teología no encontrada."));
            Tema tema = temaRepo.findById(request.getIdTema()).orElseThrow(() -> new Exception("Tema no encontrado."));
            Persona instructor = personaRepo.findById(request.getIdInstructor()).orElseThrow(() -> new Exception("Instructor no encontrado."));
            List<Persona> estudiantes = personaRepo.findAllById(request.getEstudiantesIds());

            if (estudiantes.isEmpty()) return ResponseEntity.badRequest().body("Debe añadir al menos un estudiante.");

            ClaseTeologia nuevaClase = new ClaseTeologia();
            nuevaClase.setTeologia(teo);
            nuevaClase.setTema(tema); 
            nuevaClase.setInstructor(instructor);
            nuevaClase.setEstudiantes(estudiantes);
            nuevaClase.setAnio(anioActual);
            nuevaClase.setFechaInicio(request.getFechaInicio()); 
            nuevaClase.setFechaFin(request.getFechaFin());
            nuevaClase.setEstado("Activo");

            claseRepo.save(nuevaClase);
            return ResponseEntity.ok(nuevaClase);
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    @PutMapping("/editar/{id}")
    public ResponseEntity<?> editarClase(@PathVariable Integer id, @RequestBody ClaseTeologiaRequestDTO request) {
        try {
            if (request.getFechaInicio() == null || request.getFechaFin() == null) {
                return ResponseEntity.badRequest().body("Las fechas de inicio y fin son obligatorias.");
            }

            ClaseTeologia clase = claseRepo.findById(id).orElseThrow(() -> new Exception("Clase no encontrada."));
            int anioActual = ZonedDateTime.now(ZoneId.of("America/Caracas")).getYear();

            if (clase.getAnio() != anioActual) {
                return ResponseEntity.badRequest().body("Bloqueado: No se pueden modificar clases de años escolares cerrados.");
            }

            boolean cambioTeologia = !clase.getTeologia().getIdTeologia().equals(request.getIdTeologia());
            boolean cambioTema = !clase.getTema().getIdTema().equals(request.getIdTema());

            if (cambioTeologia || cambioTema) {
                if (claseRepo.existsByTeologia_IdTeologiaAndTema_IdTemaAndAnio(request.getIdTeologia(), request.getIdTema(), clase.getAnio())) {
                    return ResponseEntity.badRequest().body("Ya existe una clase para esta unidad curricular en el año " + clase.getAnio());
                }
            }

            Teologia teo = teologiaRepo.findById(request.getIdTeologia()).orElseThrow(() -> new Exception("Unidad no encontrada."));
            Tema tema = temaRepo.findById(request.getIdTema()).orElseThrow(() -> new Exception("Tema no encontrado."));
            Persona instructor = personaRepo.findById(request.getIdInstructor()).orElseThrow(() -> new Exception("Instructor no encontrado."));
            List<Persona> estudiantes = personaRepo.findAllById(request.getEstudiantesIds());

            if (estudiantes.isEmpty()) return ResponseEntity.badRequest().body("Debe añadir al menos un estudiante.");

            clase.setTeologia(teo);
            clase.setTema(tema); 
            clase.setInstructor(instructor);
            clase.setEstudiantes(estudiantes);
            clase.setFechaInicio(request.getFechaInicio());
            clase.setFechaFin(request.getFechaFin());
            
            claseRepo.save(clase);
            return ResponseEntity.ok(clase);
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    // =========================================================
    // ⚡ GESTIÓN DE NOTAS POR PLANIFICACIÓN ⚡
    // =========================================================

    @PostMapping("/guardar-notas")
    @SuppressWarnings("unchecked")
    public ResponseEntity<?> guardarNotas(@RequestBody Map<String, Object> payload) {
        try {
            Integer idClase = ((Number) payload.get("idClaseTeologia")).intValue();
            Integer idPlan = ((Number) payload.get("idPlanificacion")).intValue();
            List<Map<String, Object>> notasList = (List<Map<String, Object>>) payload.get("notas");

            ClaseTeologia clase = claseRepo.findById(idClase).orElseThrow(() -> new Exception("Clase no encontrada."));
            int anioActual = ZonedDateTime.now(ZoneId.of("America/Caracas")).getYear();

            if (clase.getAnio() != anioActual) {
                return ResponseEntity.badRequest().body("Bloqueado: No se pueden modificar notas de años académicos cerrados.");
            }

            Planificacion plan = planRepo.findById(idPlan).orElseThrow(() -> new Exception("Evaluación no encontrada."));

            for (Map<String, Object> notaData : notasList) {
                Integer idEstudiante = ((Number) notaData.get("idEstudiante")).intValue();
                Integer puntaje = ((Number) notaData.get("puntaje")).intValue();

                if (puntaje < 1 || puntaje > plan.getEscala()) {
                    return ResponseEntity.badRequest().body("Error: Las notas deben estar entre 1 y " + plan.getEscala() + " puntos.");
                }

                // ⚡ AQUÍ SE CORRIGIÓ LA LÍNEA DEL ERROR LLAMANDO AL MÉTODO SEGURO ⚡
                NotaTeologia nota = notaRepo.buscarNotaExacta(idClase, idPlan, idEstudiante).orElse(new NotaTeologia());

                if (nota.getIdNotaTeologia() == null) {
                    Persona estudiante = personaRepo.findById(idEstudiante).orElseThrow();
                    nota.setClaseTeologia(clase);
                    nota.setPlanificacion(plan);
                    nota.setEstudiante(estudiante);
                }

                nota.setPuntaje(puntaje);
                notaRepo.save(nota);
            }
            return ResponseEntity.ok("Calificaciones guardadas exitosamente.");
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    @GetMapping("/clase/{idClase}/planificacion/{idPlan}/notas")
    public ResponseEntity<?> obtenerNotasDePlanificacion(@PathVariable Integer idClase, @PathVariable Integer idPlan) {
        try {
            List<NotaTeologia> notasBD = notaRepo.findAll().stream()
                .filter(n -> n.getClaseTeologia().getIdClaseTeologia().equals(idClase) && n.getPlanificacion().getIdPlanificacion().equals(idPlan))
                .collect(Collectors.toList());

            Map<Integer, Integer> mapaNotas = notasBD.stream()
                .collect(Collectors.toMap(
                    n -> n.getEstudiante().getIdPersona(),
                    NotaTeologia::getPuntaje
                ));

            return ResponseEntity.ok(mapaNotas);
        } catch (Exception e) { return ResponseEntity.badRequest().body("Error al obtener notas."); }
    }
}