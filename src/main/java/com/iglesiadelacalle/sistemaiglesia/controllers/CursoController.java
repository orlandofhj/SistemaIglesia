package com.iglesiadelacalle.sistemaiglesia.controllers;

import com.iglesiadelacalle.sistemaiglesia.dto.CursoRequestDTO;
import com.iglesiadelacalle.sistemaiglesia.models.Bloque;
import com.iglesiadelacalle.sistemaiglesia.models.Curso;
import com.iglesiadelacalle.sistemaiglesia.models.CronogramaTip;
import com.iglesiadelacalle.sistemaiglesia.models.Persona;
import com.iglesiadelacalle.sistemaiglesia.models.Tip;
import com.iglesiadelacalle.sistemaiglesia.repository.BloqueRepository;
import com.iglesiadelacalle.sistemaiglesia.repository.CursoRepository;
import com.iglesiadelacalle.sistemaiglesia.repository.PersonaRepository;
import com.iglesiadelacalle.sistemaiglesia.repository.TipRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.ArrayList;
import java.util.Optional;

@RestController
@RequestMapping("/api/cursos")
@CrossOrigin(origins = "*")
public class CursoController {

    @Autowired
    private CursoRepository cursoRepository;

    @Autowired
    private BloqueRepository bloqueRepository;

    @Autowired
    private PersonaRepository personaRepository;

    @Autowired
    private TipRepository tipRepository;

    // ⚡ MÉTODO PARA VALIDAR FECHAS DE FORMA CENTRALIZADA
    private ResponseEntity<?> validarFechasEstrictas(CursoRequestDTO request) {
        LocalDate hoy = LocalDate.now(ZoneId.of("America/Caracas"));

        if (request.getFechaInicio() == null || request.getFechaFin() == null) {
            return ResponseEntity.badRequest().body("Las fechas de inicio y fin de la clase son obligatorias.");
        }
        if (request.getFechaInicio().isBefore(hoy) || request.getFechaFin().isBefore(hoy)) {
            return ResponseEntity.badRequest().body("Las fechas de la clase no pueden ser anteriores al día de hoy.");
        }
        if (!request.getFechaInicio().isBefore(request.getFechaFin())) {
            return ResponseEntity.badRequest().body("La fecha de inicio debe ser estrictamente anterior a la fecha de fin y no pueden ser el mismo día.");
        }

        if (request.getFechasTips() == null || request.getFechasTips().size() != 4) {
            return ResponseEntity.badRequest().body("Debe asignar fechas a todos los tips del bloque.");
        }

        for (CursoRequestDTO.TipFechaDTO tf : request.getFechasTips()) {
            if (tf.getFechaInicio() == null || tf.getFechaFin() == null) {
                return ResponseEntity.badRequest().body("Las fechas de ejecución de los tips son obligatorias.");
            }
            if (tf.getFechaInicio().isBefore(hoy) || tf.getFechaFin().isBefore(hoy)) {
                return ResponseEntity.badRequest().body("Las fechas de los tips no pueden ser en el pasado.");
            }
            if (!tf.getFechaInicio().isBefore(tf.getFechaFin())) {
                return ResponseEntity.badRequest().body("La fecha de inicio de un tip debe ser anterior a su fin.");
            }
            if (tf.getFechaInicio().isBefore(request.getFechaInicio()) || tf.getFechaFin().isAfter(request.getFechaFin())) {
                return ResponseEntity.badRequest().body("Las fechas de los tips deben estar estrictamente dentro del rango de fechas de la clase.");
            }
        }

        // Validación anti-solapamiento (Overlaps)
        for (int i = 0; i < request.getFechasTips().size(); i++) {
            for (int j = i + 1; j < request.getFechasTips().size(); j++) {
                CursoRequestDTO.TipFechaDTO t1 = request.getFechasTips().get(i);
                CursoRequestDTO.TipFechaDTO t2 = request.getFechasTips().get(j);
                
                // Si Inicio 1 <= Fin 2 AND Fin 1 >= Inicio 2 -> Se Solapan
                if (!t1.getFechaInicio().isAfter(t2.getFechaFin()) && !t1.getFechaFin().isBefore(t2.getFechaInicio())) {
                    return ResponseEntity.badRequest().body("Las fechas de ejecución de los tips no pueden chocar o solaparse entre sí.");
                }
            }
        }

        return null; // Pasó todas las validaciones
    }

    @PostMapping("/crear")
    public ResponseEntity<?> crearCurso(@RequestBody CursoRequestDTO request) {
        try {
            // ⚡ APLICAMOS TODAS LAS VALIDACIONES DE FECHA ⚡
            ResponseEntity<?> validacionFechas = validarFechasEstrictas(request);
            if (validacionFechas != null) return validacionFechas;

            Optional<Bloque> bloqueOpt = bloqueRepository.findById(request.getIdBloque());
            if (bloqueOpt.isEmpty()) return ResponseEntity.badRequest().body("El bloque seleccionado no existe.");

            int anioCaracas = ZonedDateTime.now(ZoneId.of("America/Caracas")).getYear();

            if (cursoRepository.existsByBloque_IdBloqueAndAnio(request.getIdBloque(), anioCaracas)) {
                return ResponseEntity.badRequest().body("Ya existe una clase activa para este bloque en el año escolar " + anioCaracas + ".");
            }

            Optional<Persona> instructorOpt = personaRepository.findById(request.getIdInstructor());
            if (instructorOpt.isEmpty()) return ResponseEntity.badRequest().body("El instructor seleccionado no existe.");

            List<Persona> estudiantes = personaRepository.findAllById(request.getEstudiantesIds());
            if (estudiantes.isEmpty()) return ResponseEntity.badRequest().body("Debe añadir al menos un estudiante válido.");

            Curso nuevoCurso = new Curso();
            nuevoCurso.setBloque(bloqueOpt.get());
            nuevoCurso.setInstructor(instructorOpt.get());
            nuevoCurso.setEstudiantes(estudiantes);
            nuevoCurso.setAnio(anioCaracas);
            nuevoCurso.setFechaInicio(request.getFechaInicio());
            nuevoCurso.setFechaFin(request.getFechaFin());
            nuevoCurso.setEstado("Activo");

            List<CronogramaTip> cTips = new ArrayList<>();
            for (CursoRequestDTO.TipFechaDTO tf : request.getFechasTips()) {
                CronogramaTip ct = new CronogramaTip();
                ct.setCurso(nuevoCurso);
                Tip tip = tipRepository.findById(tf.getIdTip()).orElseThrow();
                ct.setTip(tip);
                ct.setFechaInicio(tf.getFechaInicio());
                ct.setFechaFin(tf.getFechaFin());
                cTips.add(ct);
            }
            nuevoCurso.setFechasTips(cTips);

            cursoRepository.save(nuevoCurso);
            return ResponseEntity.ok(nuevoCurso);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error al crear la clase: " + e.getMessage());
        }
    }

    @PutMapping("/editar/{id}")
    public ResponseEntity<?> editarCurso(@PathVariable Integer id, @RequestBody CursoRequestDTO request) {
        try {
            // ⚡ APLICAMOS TODAS LAS VALIDACIONES DE FECHA ⚡
            ResponseEntity<?> validacionFechas = validarFechasEstrictas(request);
            if (validacionFechas != null) return validacionFechas;

            Curso cursoExistente = cursoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("La clase no existe."));

            int anioActual = ZonedDateTime.now(ZoneId.of("America/Caracas")).getYear();
            if (cursoExistente.getAnio() != anioActual) {
                return ResponseEntity.badRequest().body("Bloqueado: No se pueden modificar clases de años escolares pasados.");
            }

            Optional<Bloque> bloqueOpt = bloqueRepository.findById(request.getIdBloque());
            if (bloqueOpt.isEmpty()) return ResponseEntity.badRequest().body("El bloque seleccionado no existe.");

            if (!cursoExistente.getBloque().getIdBloque().equals(request.getIdBloque())) {
                if (cursoRepository.existsByBloque_IdBloqueAndAnio(request.getIdBloque(), cursoExistente.getAnio())) {
                    return ResponseEntity.badRequest().body("Ya existe una clase para este bloque en el año " + cursoExistente.getAnio() + ".");
                }
            }

            Optional<Persona> instructorOpt = personaRepository.findById(request.getIdInstructor());
            if (instructorOpt.isEmpty()) return ResponseEntity.badRequest().body("El instructor seleccionado no existe.");

            List<Persona> estudiantes = personaRepository.findAllById(request.getEstudiantesIds());
            if (estudiantes.isEmpty()) return ResponseEntity.badRequest().body("Debe añadir al menos un estudiante.");

            cursoExistente.setBloque(bloqueOpt.get());
            cursoExistente.setInstructor(instructorOpt.get());
            cursoExistente.setEstudiantes(estudiantes);
            cursoExistente.setFechaInicio(request.getFechaInicio());
            cursoExistente.setFechaFin(request.getFechaFin());

            cursoExistente.getFechasTips().clear();
            for (CursoRequestDTO.TipFechaDTO tf : request.getFechasTips()) {
                CronogramaTip ct = new CronogramaTip();
                ct.setCurso(cursoExistente);
                Tip tip = tipRepository.findById(tf.getIdTip()).orElseThrow();
                ct.setTip(tip);
                ct.setFechaInicio(tf.getFechaInicio());
                ct.setFechaFin(tf.getFechaFin());
                cursoExistente.getFechasTips().add(ct);
            }

            cursoRepository.save(cursoExistente);
            return ResponseEntity.ok(cursoExistente);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error al editar la clase: " + e.getMessage());
        }
    }

    @GetMapping("/todos")
    public ResponseEntity<?> obtenerTodosLosCursos() {
        try {
            List<Curso> cursos = cursoRepository.findAll();
            cursos.sort((c1, c2) -> c2.getIdCurso().compareTo(c1.getIdCurso()));
            return ResponseEntity.ok(cursos);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error al cargar las clases: " + e.getMessage());
        }
    }
}